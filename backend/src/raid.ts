import { Hono } from "hono"
import z from "zod"
import {
  CreateEditRaidRequest,
  CreateEditRaidResponse,
  EditAdminRequest,
  EditAdminResponse,
  GetMyRaidsResponse,
  GetRaidResponse,
  Guild,
  LockRaidResponse,
  Raid,
  User,
} from "../shared/types.ts"
import { beginWithTimeout, sql } from "./database.ts"
import { raidIdSchema, userSchema, uuidSchema } from "./schemas.ts"
import { generateRaidId, getOrCreateUser } from "./utils.ts"

const app = new Hono()

export const getRecentRaids = async (
  user: User,
  n?: number,
): Promise<Raid[]> => {
  return (
    await sql<{ raid: Raid }[]>`select raid
        from raids
        where
          raid @> ${{
      attendees: [{ user: { userId: user.userId } }],
    } as never}
        or
        raid @> ${{ admins: [{ userId: user.userId }] } as never}
        order by raid->'time' desc
        limit ${n || null}
        ;`
  ).map((r) => r.raid)
}
app.post("/api/raid/create", async (c) => {
  const user = await getOrCreateUser(c)

  const request = z
    .object({
      raidId: raidIdSchema.optional(),
      hardReserves: z.array(z.number()),
      allowDuplicateSr: z.boolean(),
      useSrPlus: z.boolean(),
      description: z.string().max(280),
      time: z.iso.datetime(),
      instanceId: z.number(),
      srCount: z.number().max(4).min(1),
      guildId: uuidSchema.optional(),
    })
    .safeParse(await c.req.json())

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
        { raid: Raid }[]
      >`select raid from raids where raid @> ${{
        id: raidId,
      } as never} for update;`
      if (guildId) {
        const [result] = await sql<{ guild: Guild }[]>`select guild
            from guilds
            where
              guild @> ${{
          admins: [{ userId: user.userId }],
          id: guildId,
        } as never};`
        if (!result?.guild) {
          return {
            error: {
              message: "You are not an admin of a guild with that id",
            },
            user,
          }
        }
      }

      const raid = result?.raid
      if (raid && !raid.admins.some((u) => u.userId == user.userId)) {
        return {
          error: { message: "You are not allowed to edit this raid" },
          user,
        }
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
      updatedRaid.activityLog.push({
        type: "RaidChanged",
        time: new Date().toISOString(),
        byUser: user,
        change,
      })

      await tx`insert into raids ${
        sql({
          raid: updatedRaid,
        } as never)
      } on conflict ((raid->>'id')) do update set raid = EXCLUDED.raid;`
      return {
        data: { raidId },
        user,
      }
    },
  )

  return c.json(response)
})

app.get("/api/raids", async (c) => {
  const user = await getOrCreateUser(c)
  const raids = await getRecentRaids(user)
  const response: GetMyRaidsResponse = { data: raids, user }
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
      raid.activityLog.push({
        type: "RaidChanged",
        time: new Date().toISOString(),
        byUser: user,
        change,
      })
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

app.post("/api/admin", async (c) => {
  const user = await getOrCreateUser(c)
  const request = z
    .object({
      raidId: raidIdSchema,
      add: userSchema.optional(),
      remove: userSchema.optional(),
    })
    .safeParse(await c.req.json())

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

  const { raidId, add, remove } = (await c.req.json()) as EditAdminRequest

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
        raid.activityLog.push({
          byUser: user,
          type: "AdminChanged",
          character: raid.attendees.find((a) => a.user.userId == add.userId)
            ?.character,
          time: new Date().toISOString(),
          change: "promoted",
          user: add,
        })
      }
      if (remove && raid.owner.userId != remove.userId) {
        raid.admins = raid.admins.filter((a) => a.userId != remove.userId)
        raid.activityLog.push({
          byUser: user,
          type: "AdminChanged",
          time: new Date().toISOString(),
          character: raid.attendees.find((a) => a.user.userId == remove.userId)
            ?.character,
          change: "removed",
          user: remove,
        })
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

export default app
