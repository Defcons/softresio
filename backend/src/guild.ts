import { Hono } from "hono"
import { getOrCreateUser } from "./utils.ts"
import z from "zod"
import {
  CreateGuildRequest,
  CreateGuildResponse,
  GetMyGuildsResponse,
  Guild,
} from "../shared/types.ts"
import { randomUUID } from "node:crypto"
import { sql } from "./database.ts"

const app = new Hono()

app.post("/api/guild/create", async (c) => {
  const user = await getOrCreateUser(c)

  const request = z
    .object({
      name: z.string().max(40).min(1),
    })
    .safeParse(await c.req.json())

  if (!request.data) {
    const response: CreateGuildResponse = {
      error: {
        message: "Invalid request",
        issues: request.error.issues,
      },
      user,
    }
    return c.json(response, 400)
  }
  const { name }: CreateGuildRequest = request.data

  const guild: Guild = {
    name,
    id: randomUUID(),
    owner: user,
    admins: [user],
    srPlus: [],
  }

  await sql`insert into guilds ${sql({ guild: guild } as never)}`

  const response: CreateGuildResponse = {
    user,
  }
  return c.json(response)
})

app.get("/api/guilds", async (c) => {
  const user = await getOrCreateUser(c)
  const result = await sql<{ guild: Guild }[]>`select guild
      from guilds
      where
        guild @> ${{
    admins: [{ userId: user.userId }],
  } as never};`
  const response: GetMyGuildsResponse = {
    data: result.map((r) => r.guild),
    user,
  }
  return c.json(response)
})

export default app
