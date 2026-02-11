import { Hono } from "hono"
import { serveStatic, upgradeWebSocket } from "hono/deno"
import * as jwt from "hono/jwt"
import { randomUUID } from "node:crypto"
import * as z from "zod"
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
  GetSrPlusResponse,
  Guild,
  InfoResponse,
  LockRaidResponse,
  Raid,
  SignOutResponse,
  SoftReserve,
  SrPlus,
  SrPlusManualChangeRequest,
  SrPlusManualChangeResponse,
  User,
} from "../shared/types.ts"
import { diff, removeOne } from "../shared/utils.ts"
import {
  DISCORD_API_ENDPOINT,
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_LOGIN_ENABLED,
  DISCORD_REDIRECT_URI,
  JWT_SECRET,
} from "./config.ts"
import { beginWithTimeout, sql } from "./database.ts"
import { instances } from "./instances.ts"
import {
  characterSchema,
  raidIdSchema,
  userSchema,
  uuidSchema,
} from "./schemas.ts"
import { generateRaidId, getOrCreateUser, setAuthCookie } from "./utils.ts"
import guildRoutes from "./guild.ts"

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

app.route("/", guildRoutes)

app.get("/api/instances", async (c) => {
  const user = await getOrCreateUser(c)
  const response: GetInstancesResponse = { data: instances, user }
  return c.json(response)
})

app.post("/api/sr/create", async (c) => {
  const user = await getOrCreateUser(c)
  const request = z.object({
    raidId: raidIdSchema,
    character: characterSchema,
    selectedItemIds: z.array(z.number()),
  }).safeParse(await c.req.json())

  if (!request.data) {
    const response: CreateSrResponse = {
      error: {
        message: "Invalid request",
        issues: request.error.issues,
      },
      user,
    }
    return c.json(response, 400)
  }

  const { raidId, character, selectedItemIds }: CreateSrRequest = request.data

  const softReserves: SoftReserve[] = selectedItemIds.map((
    itemId,
  ) => ({ itemId, srPlus: null, comment: null }))
  const attendee: Attendee = {
    character,
    softReserves,
    user,
  }
  const response: CreateSrResponse = await beginWithTimeout(async (tx) => {
    const [result] = await tx<
      { raid: Raid }[]
    >`select raid from raids where raid @> ${{
      id: raidId,
    } as never} for update;`
    const raid = result?.raid
    if (!raid) return { user, error: { message: "Raid not found" } }
    if (raid.locked) return { user, error: { message: "Raid is locked" } }

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

  const request = z.object({
    raidId: raidIdSchema.optional(),
    hardReserves: z.array(z.number()),
    allowDuplicateSr: z.boolean(),
    useSrPlus: z.boolean(),
    description: z.string().max(280),
    time: z.iso.datetime(),
    instanceId: z.number(),
    srCount: z.number().max(4).min(1),
    guildId: uuidSchema.optional(),
  }).safeParse(await c.req.json())

  if (!request.data) {
    const response: CreateEditRaidResponse = {
      error: {
        message: "Invalid request",
        issues: request.error.issues,
      },
      user,
    }
    return c.json(response, 400)
  }

  const {
    raidId: editRaidId,
    instanceId,
    srCount,
    useSrPlus,
    time,
    description,
    hardReserves,
    allowDuplicateSr,
    guildId,
  }: CreateEditRaidRequest = request.data

  const raidId = editRaidId || generateRaidId()
  const response: CreateEditRaidResponse = await beginWithTimeout(
    async (tx) => {
      const [result] = await tx<
        ({ raid: Raid })[]
      >`select raid from raids where raid @> ${{
        id: raidId,
      } as never} for update;`
      if (guildId) {
        const [result] = await sql<
          { guild: Guild }[]
        >`select guild 
            from guilds 
            where 
              guild @> ${{
          admins: [{ userId: user.userId }],
          id: guildId,
        } as never};`
        if (!result?.guild) {
          return ({
            error: {
              message: "You are not an admin of a guild with that id",
            },
            user,
          })
        }
      }

      const raid = result?.raid
      if (raid && !raid.admins.some((u) => u.userId == user.userId)) {
        return ({
          error: { message: "You are not allowed to edit this raid" },
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
        guildId,
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
  const request = z.object({
    raidId: raidIdSchema,
    add: userSchema.optional(),
    remove: userSchema.optional(),
  }).safeParse(await c.req.json())

  if (!request.data) {
    const response: EditAdminResponse = {
      error: {
        message: "Invalid request",
        issues: request.error.issues,
      },
      user,
    }
    return c.json(response, 400)
  }

  const {
    raidId,
    add,
    remove,
  } = await c.req
    .json() as EditAdminRequest

  const response: EditAdminResponse = await beginWithTimeout(async (tx) => {
    const [result] = await tx<
      { raid: Raid }[]
    >`select raid from raids where raid @> ${{
      id: raidId,
    } as never} for update;`
    const raid = result?.raid
    if (!raid) return { user, error: { message: "Raid not found" } }

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

  const request = raidIdSchema.safeParse(c.req.param("raidId"))
  if (!request.data) {
    const response: EditAdminResponse = {
      error: { message: "Missing raidId from request" },
      user,
    }
    return c.json(response)
  }
  const raidId = request.data

  const response: LockRaidResponse = await beginWithTimeout(async (tx) => {
    const [result] = await tx<
      { raid: Raid }[]
    >`select raid from raids where raid @> ${{
      id: raidId,
    } as never} for update;`
    const raid = result?.raid
    if (!raid) return { user, error: { message: "Raid not found" } }

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
      return {
        user,
        error: { message: "You are not allowed to lock this raid" },
      }
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

  const requestRaw = z.object({
    raidId: z.string().length(5),
    user: userSchema,
    itemId: z.number(),
  }).safeParse(await c.req.json())

  if (!requestRaw.data) {
    const response: DeleteSrResponse = {
      error: {
        message: "Invalid request",
        issues: requestRaw.error.issues,
      },
      user,
    }
    return c.json(response, 400)
  }
  const request: DeleteSrRequest = requestRaw.data

  const response: DeleteSrResponse = await beginWithTimeout(async (tx) => {
    const [result] = await tx<
      { raid: Raid }[]
    >`select raid from raids where raid @> ${{
      id: request.raidId,
    } as never} for update;`
    const raid = result?.raid
    if (!raid) return { user, error: { message: "Raid not found" } }

    if (
      raid.admins.some((u) => u.userId == user.userId) ||
      (request.user.userId == user.userId && !raid.locked)
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
      return {
        user,
        error: { message: "You are not allowed to delete that SR" },
      }
    }
  })
  return c.json(response)
})

app.post("/api/srplus", async (c) => {
  const user = await getOrCreateUser(c)
  const request = z.object({
    guildId: uuidSchema,
    characterName: z.string().max(12).min(1),
    itemId: z.number(),
    value: z.number().min(0).max(1000),
  }).safeParse(await c.req.json())

  if (!request.data) {
    const response: SrPlusManualChangeResponse = {
      error: {
        message: "Invalid request",
        issues: request.error.issues,
      },
      user,
    }
    return c.json(response, 400)
  }

  const {
    guildId,
    characterName,
    itemId,
    value,
  }: SrPlusManualChangeRequest = request.data

  const response: SrPlusManualChangeResponse = await beginWithTimeout(
    async (tx) => {
      const [result] = await sql<
        { guild: Guild }[]
      >`select guild 
          from guilds 
          where 
            guild @> ${{
        admins: [{ userId: user.userId }],
        id: guildId,
      } as never} for update;`
      if (!result?.guild) {
        return ({
          error: {
            message: "You are not an admin of a guild with that id",
          },
          user,
        })
      }
      const guild = result.guild
      guild.srPlus.push({
        type: "manual",
        time: (new Date()).toISOString(),
        characterName,
        itemId,
        value,
      })
      await tx`insert into guilds ${
        sql({ guild } as never)
      } on conflict ((guild->>'id')) do update set guild = EXCLUDED.guild;`
      return { user, data: guild }
    },
  )
  return c.json(response)
})

app.get("/api/srplus/:raidId", async (c) => {
  const user = await getOrCreateUser(c)
  const request = z.string().length(5).safeParse(c.req.param("raidId"))
  if (!request.data) {
    const response: GetSrPlusResponse = {
      error: { message: "Missing raidId from request" },
      user,
    }
    return c.json(response)
  }
  const raidId = request.data
  const [raidResult] = await sql<
    { raid: Raid }[]
  >`select raid from raids where raid @> ${{
    id: raidId,
  } as never};`
  const raid = raidResult?.raid
  if (!raid) {
    return c.json({ error: { message: "Raid not found" } }, 404)
  }
  if (!raid.guildId) {
    return c.json({ error: { message: "Raid has no guild" } }, 400)
  }
  const [guildResult] = await sql<
    { guild: Guild }[]
  >`select guild 
      from guilds 
      where 
        guild @> ${{
    id: raid.guildId,
  } as never};`
  if (!guildResult?.guild) {
    return c.json({
      error: {
        message: "Guild not found",
      },
      user,
    })
  }
  const guild = guildResult.guild
  const srPlus: SrPlus[] = []
  for (const attendee of raid.attendees) {
    for (const softReserve of attendee.softReserves) {
      const raids = await sql<
        { id: string; time: string }[]
      >`select raid->'id' as id, raid->'time' as time from raids where raid @> ${{
        guildId: raid.guildId,
        attendees: [
          {
            character: {
              name: attendee.character.name,
            },
            softReserves: [
              { itemId: softReserve.itemId },
            ],
          },
        ],
      } as never} and raid->>'time' < ${raid.time};`
      for (const raid of raids) {
        srPlus.push({
          type: "raid",
          raidId: raid.id,
          time: raid.time,
          characterName: attendee.character.name,
          itemId: softReserve.itemId,
        })
      }
      for (const srPlusChange of guild.srPlus) {
        if (
          srPlusChange.itemId == softReserve.itemId &&
          srPlusChange.characterName == attendee.character.name
        ) {
          srPlus.push(srPlusChange)
        }
      }
    }
  }
  const response: GetSrPlusResponse = {
    user,
    data: srPlus,
  }
  return c.json(response)
})

app.get("/api/raid/:raidId", async (c) => {
  const user = await getOrCreateUser(c)
  const request = raidIdSchema.safeParse(c.req.param("raidId"))
  if (!request.data) {
    const response: EditAdminResponse = {
      error: { message: "Missing raidId from request" },
      user,
    }
    return c.json(response)
  }
  const raidId = request.data
  const [result] = await sql<
    { raid: Raid }[]
  >`select raid from raids where raid @> ${{
    id: raidId,
  } as never};`
  const raid = result?.raid
  if (!raid) {
    return c.json({ error: { message: "Raid not found" } }, 404)
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
    return c.json({ error: { message: "Discord login is not enabled" } })
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
