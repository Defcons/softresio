import { Hono } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import { serveStatic, upgradeWebSocket } from "hono/deno"
import * as jwt from "hono/jwt"
import { randomUUID } from "node:crypto"
import type {
  Character,
  GetCharactersResponse,
  GetInstancesResponse,
  InfoResponse,
  LiveUpdate,
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
import srRoutes, { getSrPluses } from "./sr.ts"
import { instances } from "./instances.ts"
import raidRoutes, { getRecentRaids } from "./raid.ts"
import adminRoutes from "./admin.ts"
import {
  canMoveRaids,
  checkOAuthState,
  newOAuthState,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE,
} from "./login.ts"
import { raidIdSchema } from "./schemas.ts"
import { getOrCreateUser, isAdmin, setAuthCookie } from "./utils.ts"

await sql.listen("raid_updated", async (raidId) => {
  if (raidId in clients) {
    console.log(`raidId: ${raidId}, client: ${clients[raidId].length}`)

    const [{ raid }] = await sql<
      { raid: Raid }[]
    >`select raid from raids where raid @> ${{
      id: raidId,
    } as never} for update;`

    if (raid) {
      const srPluses = raid.guildId ? await getSrPluses(raid) : undefined
      for (const client of clients[raidId]) {
        const liveUpdate: LiveUpdate = { raid, srPluses }
        client.ws.send(JSON.stringify(liveUpdate))
      }
    }
  }
})

const app = new Hono()

app.route("/", guildRoutes)
app.route("/", raidRoutes)
app.route("/", srRoutes)
app.route("/", adminRoutes)

app.get("/api/instances", async (c) => {
  const user = await getOrCreateUser(c)
  const response: GetInstancesResponse = { data: instances, user }
  return c.json(response)
})

type WebSocketSession = {
  ws: any
  id: string
}

// No prototype, so a raidId such as "constructor" finds nothing inherited.
const clients: { [raidId: string]: WebSocketSession[] } = Object.create(null)

app.get(
  "/api/ws/:raidId",
  async (c, next) => {
    if (!raidIdSchema.safeParse(c.req.param("raidId")).success) {
      return c.text("Bad raid id", 400)
    }
    await next()
  },
  upgradeWebSocket((c) => {
    const id = randomUUID()
    return {
      onOpen(event, ws) {
        const raidId = c.req.param("raidId")
        clients[raidId] = [{ ws, id }, ...(clients[raidId] || [])]
      },
      onClose(event, ws) {
        const raidId = c.req.param("raidId")
        const rest = (clients[raidId] || []).filter((e) => e.id != id)
        if (rest.length) clients[raidId] = rest
        else delete clients[raidId]
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
      isAdmin: isAdmin(user),
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

app.get("/api/discord/login", (c) => {
  if (!DISCORD_LOGIN_ENABLED) {
    return c.json({ error: { message: "Discord login is not enabled" } })
  }
  const { state, cookie } = newOAuthState(c.req.query("return"))
  setCookie(c, OAUTH_STATE_COOKIE, cookie, {
    path: "/api/discord",
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
    maxAge: OAUTH_STATE_MAX_AGE,
  })
  const authorize = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    response_type: "code",
    redirect_uri: DISCORD_REDIRECT_URI,
    scope: "identify",
    state,
  })
  return c.redirect(`https://discord.com/oauth2/authorize?${authorize}`)
})

app.get("/api/discord", async (c) => {
  const oldUser = await getOrCreateUser(c)
  if (!DISCORD_LOGIN_ENABLED) {
    return c.json({ error: { message: "Discord login is not enabled" } })
  }
  const returnPath = checkOAuthState(
    getCookie(c, OAUTH_STATE_COOKIE),
    c.req.query("state"),
  )
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: "/api/discord", secure: true })
  if (returnPath === null) {
    return c.redirect("/")
  }
  const code = c.req.query("code")
  if (!code) {
    // Discord sends no code when the user cancels the login.
    return c.redirect(returnPath)
  }
  const accessRequest = new URLSearchParams({
    grant_type: "authorization_code",
    code,
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
      // Discord may return null for users without a custom avatar — store it
      // only when truthy so the frontend can fall back to the default avatar.
      ...(userData.avatar ? { avatar: userData.avatar } : {}),
    }
    const token = await jwt.sign(newUser as never, JWT_SECRET, "HS256")
    setAuthCookie(c, token)
    const [{ count: newUserRaids }] =
      await sql`select count(*) from raids where raid::text like ${`%${newUser.userId}%`}`
    if (canMoveRaids(oldUser, newUser.userId, newUserRaids)) {
      await sql`
        update raids set raid = replace(raid::text, ${oldUser.userId}, ${newUser.userId})::jsonb
        where raid::text like ${`%${oldUser.userId}%`};
      `
    }
  }
  return c.redirect(returnPath)
})

// AdSense site authorization. Site-level approval flows from epoglogs.com to
// softres.epoglogs.com under the same publisher; ads.txt makes the relationship
// explicit at the subdomain level.
app.get("/ads.txt", (c) => {
  c.header("Content-Type", "text/plain; charset=utf-8")
  return c.body("google.com, pub-6185202164526736, DIRECT, f08c47fec0942fa0\n")
})

// Serve the frontend
app.use("/assets/*", serveStatic({ root: "./static" }))
app.use("/favicon.ico", serveStatic({ path: "./static/favicon.ico" }))
app.use("*", serveStatic({ path: "./static/index.html" }))

export default { fetch: app.fetch }
