import postgres, { TransactionSql } from "postgres"
import process from "node:process"
import type {
  Attendee,
  Character,
  CreateEditRaidRequest,
  CreateEditRaidResponse,
  CreateSrRequest,
  CreateSrResponse,
  DeleteSrRequest,
  DeleteSrResponse,
  EditAdminRequest,
  EditAdminResponse,
  GetCharactersResponse,
  GetInstancesResponse,
  GetMyRaidsResponse,
  GetRaidResponse,
  Instance,
  LockRaidResponse,
  Raid,
  SoftReserve,
  User,
} from "../shared/types.ts"
import { removeOne } from "../shared/utils.ts"
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
  create unique index if not exists idx_raidId ON raids ((raid->'sheet'->>'raidId'));
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
  const response: CreateSrResponse = await beginWithTimeout(async (tx) => {
    const [raid] = await tx<
      Raid[]
    >`select raid -> 'sheet' as sheet from raids where raid @> ${{
      sheet: { raidId },
    } as never} for update;`
    if (!raid) return { user, error: "Raid not found" }
    if (raid.sheet.locked) return { user, error: "Raid is locked" }
    raid.sheet.attendees = raid.sheet.attendees.filter((attendee) =>
      attendee.character.name !== character.name &&
      attendee.user.userId !== user.userId
    )
    raid.sheet.attendees = [...raid.sheet.attendees, attendee]
    for (const sr of softReserves) {
      raid.sheet.activityLog.push(
        {
          byUser: user,
          type: "SrChanged",
          time: (new Date()).toISOString(),
          change: "created",
          character: attendee.character,
          itemId: sr.itemId,
        },
      )
    }
    await tx`update raids set ${sql({ raid: raid } as never)} where raid @> ${{
      sheet: { raidId },
    } as never}`
    return { user, data: raid.sheet }
  })
  return c.json(response)
})

app.post("/api/raid/create", async (c) => {
  const user = await getOrCreateUser(c)
  const {
    raidId: editRaidId,
    instanceId,
    srCount,
    useSrPlus,
    time,
    description,
    hardReserves,
    allowDuplicateSr,
  } = await c.req
    .json() as CreateEditRaidRequest

  const raidId = editRaidId || generateRaidId()
  const response: CreateEditRaidResponse = await beginWithTimeout(
    async (tx) => {
      const [raid] = await tx<
        (Raid | undefined)[]
      >`select raid -> 'sheet' as sheet from raids where raid @> ${{
        sheet: { raidId },
      } as never} for update;`

      if (raid && !raid.sheet.admins.some((u) => u.userId == user.userId)) {
        return ({
          error: "You are not allowed to edit this raid",
          user,
        })
      }

      const updatedRaid: Raid = {
        sheet: {
          raidId,
          instanceId,
          time,
          useSrPlus,
          srCount,
          description,
          locked: false,
          activityLog: raid?.sheet.activityLog || [],
          attendees: raid?.sheet.attendees || [],
          admins: raid?.sheet.admins || [user],
          owner: raid?.sheet.owner || user,
          hardReserves,
          allowDuplicateSr,
        },
      }

      if (raid?.sheet.instanceId !== updatedRaid.sheet.instanceId) {
        updatedRaid.sheet.attendees = []
      }

      const change = raid ? "edited" : "created"
      updatedRaid.sheet.activityLog.push(
        {
          type: "RaidChanged",
          time: (new Date()).toISOString(),
          byUser: user,
          change,
        },
      )

      await tx`insert into raids ${
        sql({ raid: updatedRaid } as never)
      } on conflict ((raid->'sheet'->>'raidId')) do update set raid = EXCLUDED.raid;`
      return ({
        data: { raidId },
        user,
      })
    },
  )

  return c.json(response)
})

app.post("/api/admin", async (c) => {
  const user = await getOrCreateUser(c)
  const {
    raidId,
    add,
    remove,
  } = await c.req
    .json() as EditAdminRequest
  const response: EditAdminResponse = await beginWithTimeout(async (tx) => {
    const [raid] = await tx<
      Raid[]
    >`select raid -> 'sheet' as sheet from raids where raid @> ${{
      sheet: { raidId },
    } as never} for update;`
    if (!raid) return { user, error: "Raid not found" }

    if (raid.sheet.admins.some((u) => u.userId == user.userId)) {
      if (add && raid.sheet.admins.some((a) => a.userId != add.userId)) {
        raid.sheet.admins = [...raid.sheet.admins, add]
        raid.sheet.activityLog.push(
          {
            byUser: user,
            type: "AdminChanged",
            character: raid.sheet.attendees.find((a) =>
              a.user.userId == add.userId
            )?.character,
            time: (new Date()).toISOString(),
            change: "promoted",
            user: add,
          },
        )
      }
      if (remove && raid.sheet.owner.userId != remove.userId) {
        raid.sheet.admins = raid.sheet.admins.filter((a) =>
          a.userId != remove.userId
        )
        raid.sheet.activityLog.push(
          {
            byUser: user,
            type: "AdminChanged",
            time: (new Date()).toISOString(),
            character: raid.sheet.attendees.find((a) =>
              a.user.userId == remove.userId
            )?.character,
            change: "removed",
            user: remove,
          },
        )
      }
      await tx`update raids set ${
        sql({ raid: raid } as never)
      } where raid @> ${{
        sheet: { raidId },
      } as never}`
    }

    return { user, data: raid.sheet }
  })
  return c.json(response)
})

app.post("/api/raid/:raidId/lock", async (c) => {
  const user = await getOrCreateUser(c)
  const raidId = c.req.param("raidId")
  const response: LockRaidResponse = await beginWithTimeout(async (tx) => {
    const [raid] = await tx<
      Raid[]
    >`select raid -> 'sheet' as sheet from raids where raid @> ${{
      sheet: { raidId },
    } as never} for update;`
    if (!raid) return { user, error: "Raid not found" }

    if (raid.sheet.admins.some((u) => u.userId == user.userId)) {
      raid.sheet.locked = !raid.sheet.locked
      const change = raid.sheet.locked ? "locked" : "unlocked"
      raid.sheet.activityLog.push(
        {
          type: "RaidChanged",
          time: (new Date()).toISOString(),
          byUser: user,
          change,
        },
      )
    } else {
      return { user, error: "You are not allowed to lock this raid" }
    }

    await tx`update raids set ${sql({ raid: raid } as never)} where raid @> ${{
      sheet: { raidId },
    } as never}`
    return { user, data: raid.sheet }
  })
  return c.json(response)
})

app.post("/api/sr/delete", async (c) => {
  const user = await getOrCreateUser(c)
  const request = await c.req.json() as DeleteSrRequest
  const response: DeleteSrResponse = await beginWithTimeout(async (tx) => {
    const [raid] = await tx<
      Raid[]
    >`select raid -> 'sheet' as sheet from raids where raid @> ${{
      sheet: { raidId: request.raidId },
    } as never} for update;`
    if (!raid) return { user, error: "Raid not found" }

    if (
      raid.sheet.admins.some((u) => u.userId == user.userId) ||
      request.user.userId == user.userId
    ) {
      raid.sheet.attendees = raid.sheet.attendees.map((attendee) => ({
        user: attendee.user,
        character: attendee.character,
        softReserves: removeOne(
          (softReserve) =>
            attendee.user.userId == request.user.userId &&
            softReserve.itemId == request.itemId,
          attendee.softReserves,
        ),
      }))
      raid.sheet.activityLog.push(
        {
          byUser: user,
          type: "SrChanged",
          time: (new Date()).toISOString(),
          change: "deleted",
          character: raid.sheet.attendees.find((a) =>
            a.user.userId == request.user.userId
          )?.character,
          itemId: request.itemId,
        },
      )
      await tx`update raids set ${
        sql({ raid: raid } as never)
      } where raid @> ${{
        sheet: { raidId: request.raidId },
      } as never}`
      return { user, data: raid.sheet }
    } else {
      return { user, error: "You are not allowed to delete that SR" }
    }
  })
  return c.json(response)
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
app.use("/favicon.ico", serveStatic({ path: "./static/favicon.ico" }))
app.use("*", serveStatic({ path: "./static/index.html" }))

export default { fetch: app.fetch }
