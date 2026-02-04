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
  InfoResponse,
  Instance,
  LockRaidResponse,
  Raid,
  SignOutResponse,
  SoftReserve,
  User,
} from "../shared/types.ts"
import { diff, removeOne } from "../shared/utils.ts"
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
const PORT = process.env["PORT"]
const DOMAIN = getEnv("DOMAIN")
const SCHEME = getEnv("SCHEME")
const JWT_SECRET = getEnv("JWT_SECRET")

const DISCORD_LOGIN_ENABLED = process.env["DISCORD_LOGIN_ENABLED"]
const DISCORD_CLIENT_ID = DISCORD_LOGIN_ENABLED && getEnv("DISCORD_CLIENT_ID")
const DISCORD_CLIENT_SECRET = DISCORD_LOGIN_ENABLED &&
  getEnv("DISCORD_CLIENT_SECRET")
const DISCORD_API_ENDPOINT = "https://discord.com/api/v10"

const DISCORD_REDIRECT_URI = `${SCHEME}://${DOMAIN}${
  PORT ? `:${PORT}` : ""
}/api/discord`

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
  create table if not exists "guilds" ( guild jsonb );
`

await sql`
  create index if not exists idxraids ON raids using gin ( raid );
`

await sql`
  create unique index if not exists idx_raidId ON raids ((raid->>'id'));
`

await sql`
create or replace function notify_raid_changed()
  returns trigger
as $$
begin
  perform pg_notify('raid_updated', (new.raid->>'id'));
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

await sql.listen("raid_updated", async (raidId) => {
  if (raidId in clients) {
    console.log(
      `raidId: ${raidId}, client: ${clients[raidId].length}`,
    )

    const [{ raid }] = await sql<
      { raid: Raid }[]
    >`select raid from raids where raid @> ${{
      id: raidId,
    } as never} for update;`

    if (raid) {
      for (const client of clients[raidId]) {
        client.ws.send(JSON.stringify(raid))
      }
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

const setAuthCookie = (c: Context, cookie: string) => {
  setCookie(c, "auth", cookie, {
    secure: true,
    domain: DOMAIN,
    httpOnly: true,
    sameSite: "Lax",
    expires: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 400), // 400 days expiration
  })
}

const getOrCreateUser = async (c: Context, reset = false): Promise<User> => {
  // Try to get user from cookie
  const token = getCookie(c, "auth")
  const decoded = token && await jwt.verify(
    token,
    JWT_SECRET,
    "HS256",
  ) as unknown as User
  // Create new user cookie or refresh exisiting cookie
  const user = !reset && decoded ||
    { userId: randomUUID(), issuer: DOMAIN }
  const new_token = await jwt.sign(user as never, JWT_SECRET, "HS256")
  setAuthCookie(c, new_token)
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
    const [{ raid }] = await tx<
      { raid: Raid }[]
    >`select raid from raids where raid @> ${{
      id: raidId,
    } as never} for update;`
    if (!raid) return { user, error: "Raid not found" }
    if (raid.locked) return { user, error: "Raid is locked" }

    // need to delete all and add all new
    const oldNameCharacter = raid.attendees.find((attendee) =>
      attendee.character.name != character.name &&
      attendee.user.userId == user.userId
    )

    // need to diff
    const sameCharacter = raid.attendees.find((attendee) =>
      attendee.character.name == character.name
    )

    let changes: { itemId: number; character: Character; remove: boolean }[] =
      []
    if (oldNameCharacter) {
      // remove all
      changes = changes.concat(oldNameCharacter.softReserves.map((sr) => ({
        itemId: sr.itemId,
        character: oldNameCharacter.character,
        remove: true,
      })))
    }
    if (sameCharacter) {
      // log diff
      const { added, removed } = diff(
        sameCharacter.softReserves.map((sr) => sr.itemId),
        attendee.softReserves.map((sr) => sr.itemId),
      )
      changes = changes.concat(removed.map((itemId) => ({
        itemId: itemId,
        character: sameCharacter.character,
        remove: true,
      })))
      changes = changes.concat(added.map((itemId) => ({
        itemId: itemId,
        character: sameCharacter.character,
        remove: false,
      })))
    } else {
      // add all
      changes = changes.concat(attendee.softReserves.map((sr) => ({
        itemId: sr.itemId,
        character: attendee.character,
        remove: false,
      })))
    }

    for (const { itemId, character, remove } of changes) {
      raid.activityLog.push(
        {
          byUser: user,
          type: "SrChanged",
          time: (new Date((new Date()).getTime() + (remove ? 0 : 10)))
            .toISOString(),
          change: remove ? "deleted" : "created",
          character,
          itemId,
        },
      )
    }

    raid.attendees = raid.attendees.filter((attendee) =>
      attendee.character.name !== character.name &&
      attendee.user.userId !== user.userId
    )
    raid.attendees = [...raid.attendees, attendee]
    await tx`update raids set ${sql({ raid: raid } as never)} where raid @> ${{
      id: raidId,
    } as never}`
    return { user, data: raid }
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
      const [result] = await tx<
        ({ raid: Raid })[]
      >`select raid from raids where raid @> ${{
        id: raidId,
      } as never} for update;`
      const raid = result?.raid
      if (raid && !raid.admins.some((u) => u.userId == user.userId)) {
        return ({
          error: "You are not allowed to edit this raid",
          user,
        })
      }

      const updatedRaid: Raid = {
        id: raidId,
        instanceId,
        time,
        useSrPlus,
        srCount,
        description,
        locked: false,
        activityLog: raid?.activityLog || [],
        attendees: raid?.attendees || [],
        admins: raid?.admins || [user],
        owner: raid?.owner || user,
        hardReserves,
        allowDuplicateSr,
      }

      if (raid?.instanceId !== updatedRaid.instanceId) {
        updatedRaid.attendees = []
      }

      const change = raid ? "edited" : "created"
      updatedRaid.activityLog.push(
        {
          type: "RaidChanged",
          time: (new Date()).toISOString(),
          byUser: user,
          change,
        },
      )

      await tx`insert into raids ${
        sql({ raid: updatedRaid } as never)
      } on conflict ((raid->>'id')) do update set raid = EXCLUDED.raid;`
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
    const [{ raid }] = await tx<
      { raid: Raid }[]
    >`select raid from raids where raid @> ${{
      id: raidId,
    } as never} for update;`
    if (!raid) return { user, error: "Raid not found" }

    if (raid.admins.some((u) => u.userId == user.userId)) {
      if (add && raid.admins.some((a) => a.userId != add.userId)) {
        raid.admins = [...raid.admins, add]
        raid.activityLog.push(
          {
            byUser: user,
            type: "AdminChanged",
            character: raid.attendees.find((a) => a.user.userId == add.userId)
              ?.character,
            time: (new Date()).toISOString(),
            change: "promoted",
            user: add,
          },
        )
      }
      if (remove && raid.owner.userId != remove.userId) {
        raid.admins = raid.admins.filter((a) => a.userId != remove.userId)
        raid.activityLog.push(
          {
            byUser: user,
            type: "AdminChanged",
            time: (new Date()).toISOString(),
            character: raid.attendees.find((a) =>
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
        id: raidId,
      } as never}`
    }

    return { user, data: raid }
  })
  return c.json(response)
})

app.post("/api/raid/:raidId/lock", async (c) => {
  const user = await getOrCreateUser(c)
  const raidId = c.req.param("raidId")
  const response: LockRaidResponse = await beginWithTimeout(async (tx) => {
    const [{ raid }] = await tx<
      { raid: Raid }[]
    >`select raid from raids where raid @> ${{
      id: raidId,
    } as never} for update;`
    if (!raid) return { user, error: "Raid not found" }

    if (raid.admins.some((u) => u.userId == user.userId)) {
      raid.locked = !raid.locked
      const change = raid.locked ? "locked" : "unlocked"
      raid.activityLog.push(
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
      id: raidId,
    } as never}`
    return { user, data: raid }
  })
  return c.json(response)
})

app.post("/api/sr/delete", async (c) => {
  const user = await getOrCreateUser(c)
  const request = await c.req.json() as DeleteSrRequest
  const response: DeleteSrResponse = await beginWithTimeout(async (tx) => {
    const [{ raid }] = await tx<
      { raid: Raid }[]
    >`select raid from raids where raid @> ${{
      id: request.raidId,
    } as never} for update;`
    if (!raid) return { user, error: "Raid not found" }

    if (
      raid.admins.some((u) => u.userId == user.userId) ||
      request.user.userId == user.userId
    ) {
      raid.attendees = raid.attendees.map((attendee) => ({
        user: attendee.user,
        character: attendee.character,
        softReserves: removeOne(
          (softReserve) =>
            attendee.user.userId == request.user.userId &&
            softReserve.itemId == request.itemId,
          attendee.softReserves,
        ),
      })).filter(
        (attendee) => (attendee.softReserves.length > 0),
      )
      raid.activityLog.push(
        {
          byUser: user,
          type: "SrChanged",
          time: (new Date()).toISOString(),
          change: "deleted",
          character: raid.attendees.find((a) =>
            a.user.userId == request.user.userId
          )?.character,
          itemId: request.itemId,
        },
      )
      await tx`update raids set ${
        sql({ raid: raid } as never)
      } where raid @> ${{
        id: request.raidId,
      } as never}`
      return { user, data: raid }
    } else {
      return { user, error: "You are not allowed to delete that SR" }
    }
  })
  return c.json(response)
})

app.get("/api/raid/:raidId", async (c) => {
  const user = await getOrCreateUser(c)
  const raidId = c.req.param("raidId")
  const [{ raid }] = await sql<
    { raid: Raid }[]
  >`select raid from raids where raid @> ${{
    id: raidId,
  } as never};`
  if (!raid) {
    return c.json({ error: "Raid not found" }, 404)
  }
  const response: GetRaidResponse = { data: raid, user }
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
  return (await sql<
    { raid: Raid }[]
  >`select raid
        from raids
        where
          raid @> ${{
    attendees: [{ user: { userId: user.userId } }],
  } as never}
        or
        raid @> ${{ admins: [{ userId: user.userId }] } as never}
        order by raid->'time' desc
        limit ${n || null} 
        ;`).map((r) => r.raid)
}

app.get("/api/characters", async (c) => {
  const user = await getOrCreateUser(c)
  const raids = await getRecentRaids(user, 20)
  const distinctCharacters: Character[] = []
  const characters = raids.flatMap((raid) =>
    raid.attendees.filter((attendee) => attendee.user.userId == user.userId)
      .map((attendee) => attendee.character)
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

app.get("/api/info", async (c) => {
  const user = await getOrCreateUser(c)
  const response: InfoResponse = {
    user,
    data: {
      discordClientId: DISCORD_CLIENT_ID,
      discordLoginEnabled: !!DISCORD_LOGIN_ENABLED,
    },
  }
  return c.json(response)
})

app.get("/api/signout", async (c) => {
  const user = await getOrCreateUser(c, true)
  const response: SignOutResponse = {
    user,
  }
  return c.json(response)
})

app.get("/api/discord", async (c) => {
  const oldUser = await getOrCreateUser(c)
  if (!DISCORD_LOGIN_ENABLED) {
    return c.json({ error: "Discord login is not enabled" })
  }
  const accessRequest = new URLSearchParams({
    "grant_type": "authorization_code",
    "code": c.req.query("code") || "",
    "redirect_uri": DISCORD_REDIRECT_URI,
  })
  const accessData =
    await (await fetch(`${DISCORD_API_ENDPOINT}/oauth2/token`, {
      method: "POST",
      body: accessRequest,
      headers: {
        "Authorization": "Basic " +
          btoa(`${DISCORD_CLIENT_ID}:${DISCORD_CLIENT_SECRET}`),
      },
    })).json()
  const userData = await (await fetch(`${DISCORD_API_ENDPOINT}/users/@me`, {
    headers: { "Authorization": `Bearer ${accessData.access_token}` },
  })).json()
  if (userData && userData.id && userData.username) {
    const newUser = {
      userId: userData.id,
      issuer: "discord",
      username: userData.username,
    }
    const token = await jwt.sign(newUser as never, JWT_SECRET, "HS256")
    setAuthCookie(c, token)
    const [{ count: newUserRaids }] =
      await sql`select count(*) from raids where raid::text like ${`%${newUser.userId}%`}`
    if (newUserRaids == 0) {
      await sql`
        update raids set raid = replace(raid::text, ${oldUser.userId}, ${newUser.userId})::jsonb
        where raid::text like ${`%${oldUser.userId}%`};
      `
    }
  }
  return c.redirect(c.req.query("state") || "/")
})

// Serve the frontend
app.use("/assets/*", serveStatic({ root: "./static" }))
app.use("/favicon.ico", serveStatic({ path: "./static/favicon.ico" }))
app.use("*", serveStatic({ path: "./static/index.html" }))

export default { fetch: app.fetch }
