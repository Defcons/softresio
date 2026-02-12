import { Hono } from "hono"
import { serveStatic, upgradeWebSocket } from "hono/deno"
import * as jwt from "hono/jwt"
import { randomUUID } from "node:crypto"
import type {
  Character,
  GetCharactersResponse,
  GetInstancesResponse,
  InfoResponse,
  Raid,
  SignOutResponse,
} from "../shared/types.ts"
import {
  DISCORD_API_ENDPOINT,
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_LOGIN_ENABLED,
  DISCORD_REDIRECT_URI,
  JWT_SECRET,
} from "./config.ts"
import { sql } from "./database.ts"
import guildRoutes from "./guild.ts"
import srRoutes from "./sr.ts"
import { instances } from "./instances.ts"
import raidRoutes, { getRecentRaids } from "./raid.ts"
import { getOrCreateUser, setAuthCookie } from "./utils.ts"

await sql.listen("raid_updated", async (raidId) => {
  if (raidId in clients) {
    console.log(`raidId: ${raidId}, client: ${clients[raidId].length}`)

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
app.route("/", raidRoutes)
app.route("/", srRoutes)

app.get("/api/instances", async (c) => {
  const user = await getOrCreateUser(c)
  const response: GetInstancesResponse = { data: instances, user }
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
        clients[raidId] = [{ ws, id }, ...(clients[raidId] || [])]
      },
      onClose(event, ws) {
        const raidId = c.req.param("raidId")
        clients[raidId] = clients[raidId].filter((e) => e.id != id)
      },
    }
  }),
)

app.get("/api/characters", async (c) => {
  const user = await getOrCreateUser(c)
  const raids = await getRecentRaids(user, 20)
  const distinctCharacters: Character[] = []
  const characters = raids.flatMap((raid) =>
    raid.attendees
      .filter((attendee) => attendee.user.userId == user.userId)
      .map((attendee) => attendee.character)
  )
  for (const char of characters) {
    if (
      !distinctCharacters.some(
        (c) =>
          c.name == char.name && c.class == char.class && c.spec == char.spec,
      )
    ) {
      distinctCharacters.push(char)
    }
  }

  const response: GetCharactersResponse = { data: distinctCharacters, user }
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
    grant_type: "authorization_code",
    code: c.req.query("code") || "",
    redirect_uri: DISCORD_REDIRECT_URI,
  })
  const accessData = await (
    await fetch(`${DISCORD_API_ENDPOINT}/oauth2/token`, {
      method: "POST",
      body: accessRequest,
      headers: {
        Authorization: "Basic " +
          btoa(`${DISCORD_CLIENT_ID}:${DISCORD_CLIENT_SECRET}`),
      },
    })
  ).json()
  const userData = await (
    await fetch(`${DISCORD_API_ENDPOINT}/users/@me`, {
      headers: { Authorization: `Bearer ${accessData.access_token}` },
    })
  ).json()
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
