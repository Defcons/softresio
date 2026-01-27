import postgres, { TransactionSql } from "postgres"
import process from "node:process"
import type {
  Attendee,
  Character,
  CreateRaidRequest,
  CreateRaidResponse,
  CreateSrRequest,
  CreateSrResponse,
  GetCharactersResponse,
  GetInstancesResponse,
  GetMyRaidsResponse,
  GetRaidResponse,
  Instance,
  LockRaidResponse,
  Raid,
  SoftReserve,
  User,
} from "../types/types.ts"
import { Hono } from "hono"
import { serveStatic, upgradeWebSocket } from "hono/deno"
import type { Context } from "hono"
import { getCookie, setCookie } from "hono/cookie"
import * as fs from "node:fs"
import * as jwt from "hono/jwt"
import { randomUUID } from "node:crypto"

const instances: Instance[] = []

const getEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable ${name}`)
  }
  return value
}

const DATABASE_USER = getEnv("DATABASE_USER")
const DATABASE_PASSWORD = getEnv("DATABASE_PASSWORD")
const DOMAIN = getEnv("DOMAIN")
const JWT_SECRET = getEnv("JWT_SECRET")

fs.glob("./instances/*.json", async (err, matches) => {
  if (err) {
    throw err
  }
  for (const file of matches) {
    const instance: Instance = JSON.parse(await Deno.readTextFile(file))
    instances.push(instance)
  }
})

const sql = postgres({
  host: "database",
  user: DATABASE_USER,
  password: DATABASE_PASSWORD,
})

const beginWithTimeout = <T>(
  body: (tx: TransactionSql<{}>) => Promise<T>,
) => {
  return sql.begin(async (tx) => {
    await tx`set local transaction_timeout = '1s';`
    return await body(tx)
  })
}

await sql`
  create table if not exists "raids" ( raid jsonb );
`

await sql`
  create index if not exists idxraids ON raids using gin ( raid );
`

await sql`
create or replace function notify_raid_changed()
  returns trigger
as $$
begin
  perform pg_notify('raid_updated', (new.raid #- '{sheet,password}')::text);
  return null;
end;
$$ language plpgsql
`

await sql`
create or replace trigger raid_updated
  after update
  on raids
  for each row
  execute function notify_raid_changed();
`

await sql.listen("raid_updated", (raid) => {
  const sheet = JSON.parse(raid).sheet
  if (sheet.raidId in clients) {
    console.log(
      `raidId: ${sheet.raidId}, client: ${clients[sheet.raidId].length}`,
    )
    for (const client of clients[sheet.raidId]) {
      client.ws.send(JSON.stringify(sheet))
    }
  }
})

const app = new Hono()

const generateRaidId = (): string => {
  const characterSet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let raidId = ""
  for (let i = 0; i < 5; i++) {
    raidId += characterSet[Math.floor(Math.random() * characterSet.length)]
  }
  return raidId
}

const getOrCreateUser = async (c: Context): Promise<User> => {
  // Try to get user from cookie
  const token = getCookie(c, "auth")
  const decoded = token && await jwt.verify(
    token,
    JWT_SECRET,
    "HS256",
  ) as unknown as User
  // Create new user cookie or refresh exisiting cookie
  const user = decoded || { userId: randomUUID(), issuer: DOMAIN }
  const new_token = await jwt.sign(user as never, JWT_SECRET, "HS256")
  setCookie(c, "auth", new_token, {
    secure: true,
    domain: DOMAIN,
    httpOnly: true,
    sameSite: "Strict",
    expires: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 400), // 400 days expiration
  })
  return user
}

app.get("/api/instances", async (c) => {
  const user = await getOrCreateUser(c)
  const response: GetInstancesResponse = { data: instances, user }
  return c.json(response)
})

app.post("/api/sr/create", async (c) => {
  const user = await getOrCreateUser(c)
  const { raidId, character, selectedItemIds } = await c.req
    .json() as CreateSrRequest
  const softReserves: SoftReserve[] = selectedItemIds.map((
    itemId,
  ) => ({ itemId, srPlus: null, comment: null }))
  const attendee: Attendee = {
    character,
    softReserves,
    user,
  }
  const raid = await beginWithTimeout(async (tx) => {
    const [raid] = await tx<
      Raid[]
    >`select raid -> 'sheet' as sheet from raids where raid @> ${{
      sheet: { raidId },
    } as never} for update;`
    if (!raid) return
    if (raid.sheet.locked) return raid
    raid.sheet.attendees = raid.sheet.attendees.filter((attendee) =>
      attendee.character.name !== character.name &&
      attendee.user.userId !== user.userId
    )
    raid.sheet.attendees = [...raid.sheet.attendees, attendee]
    await tx`update raids set ${sql({ raid: raid } as never)} where raid @> ${{
      sheet: { raidId },
    } as never}`
    return raid
  })
  if (raid) {
    const response: CreateSrResponse = { user, data: raid.sheet }
    return c.json(response)
  } else {
    const response: CreateSrResponse = {
      user,
      error: "An error occured while creating your SR",
    }
    return c.json(response)
  }
})

app.post("/api/raid/create", async (c) => {
  const user = await getOrCreateUser(c)
  const {
    instanceId,
    srCount,
    useSrPlus,
    time,
    adminPassword,
    description,
    hardReserves,
  } = await c.req
    .json() as CreateRaidRequest
  const raidId = generateRaidId()
  const raid: Raid = {
    sheet: {
      raidId,
      instanceId,
      time,
      useSrPlus,
      srCount,
      description,
      locked: false,
      activityLog: [],
      attendees: [],
      admins: [
        user,
      ],
      password: {
        hash: "coming soon",
        salt: "coming soon",
      },
      hardReserves,
    },
  }
  await sql`insert into raids ${sql({ raid: raid } as never)};`
  const response: CreateRaidResponse = {
    data: { raidId },
    user,
  }

  return c.json(response)
})

app.post("/api/raid/lock/:raidId", async (c) => {
  const user = await getOrCreateUser(c)
  const raidId = c.req.param("raidId")
  const raid = await beginWithTimeout(async (tx) => {
    const [raid] = await tx<
      Raid[]
    >`select raid -> 'sheet' as sheet from raids where raid @> ${{
      sheet: { raidId },
    } as never} for update;`
    if (!raid) return

    if (raid.sheet.admins.some((u) => u.userId == user.userId)) {
      raid.sheet.locked = !raid.sheet.locked
    }

    await tx`update raids set ${sql({ raid: raid } as never)} where raid @> ${{
      sheet: { raidId },
    } as never}`
    return raid
  })
  if (raid) {
    const response: LockRaidResponse = { user, data: raid.sheet }
    return c.json(response)
  } else {
    const response: CreateSrResponse = {
      user,
      error: "An error occured while locking raid",
    }
    return c.json(response)
  }
})

app.get("/api/raid/:raidId", async (c) => {
  const user = await getOrCreateUser(c)
  const raidId = c.req.param("raidId")
  const [raid] = await sql<
    Raid[]
  >`select raid #- '{sheet,password}' -> 'sheet' as sheet from raids where raid @> ${{
    sheet: { raidId },
  } as never};`
  if (!raid) {
    return c.json({ error: "Raid not found" }, 404)
  }
  const response: GetRaidResponse = { data: raid.sheet, user }
  return c.json(response)
})

type WebSocketSession = {
  ws: any
  id: string
}

const clients: { [raidId: string]: WebSocketSession[] } = {}

app.get(
  "/api/ws/:raidId",
  upgradeWebSocket((c) => {
    const id = randomUUID()
    return {
      onOpen(event, ws) {
        const raidId = c.req.param("raidId")
        clients[raidId] = [{ ws, id }, ...clients[raidId] || []]
      },
      onClose(event, ws) {
        const raidId = c.req.param("raidId")
        clients[raidId] = clients[raidId].filter((e) => e.id != id)
      },
    }
  }),
)

const getRecentRaids = async (user: User, n?: number): Promise<Raid[]> => {
  return await sql<
    Raid[]
  >`select raid#-'{sheet,password}'->'sheet' as sheet
        from raids
        where
          raid @> ${{
    sheet: { attendees: [{ user: { userId: user.userId } }] },
  } as never}
        or
        raid @> ${{ sheet: { admins: [{ userId: user.userId }] } } as never}
        order by raid->'sheet'->'time' desc
        limit ${n || null} 
        ;`
}

app.get("/api/characters", async (c) => {
  const user = await getOrCreateUser(c)
  const raids = await getRecentRaids(user, 20)
  const distinctCharacters: Character[] = []
  const characters = raids.flatMap((raid) =>
    raid.sheet.attendees.filter((attendee) =>
      attendee.user.userId == user.userId
    ).map((attendee) => attendee.character)
  )
  for (const char of characters) {
    if (
      !distinctCharacters.some((c) =>
        c.name == char.name && c.class == char.class && c.spec == char.spec
      )
    ) {
      distinctCharacters.push(char)
    }
  }

  const response: GetCharactersResponse = { data: distinctCharacters, user }
  return c.json(response)
})

app.get("/api/raids", async (c) => {
  const user = await getOrCreateUser(c)
  const raids = await getRecentRaids(user)
  const response: GetMyRaidsResponse = { data: raids, user }
  return c.json(response)
})

// Serve the frontend
app.use("/assets/*", serveStatic({ root: "./static" }))
app.use("*", serveStatic({ path: "./static/index.html" }))

export default { fetch: app.fetch }
