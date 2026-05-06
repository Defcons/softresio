import process from "node:process"
import { getCookie, setCookie } from "hono/cookie"
import type { Context } from "hono"
import { ADMIN_DISCORD_IDS, DOMAIN, JWT_SECRET } from "./config.ts"
import { User } from "../shared/types.ts"
import * as jwt from "hono/jwt"
import { randomUUID } from "node:crypto"

// A user is a site-wide admin only when they're logged in via Discord and
// their Discord user ID is on the ADMIN_DISCORD_IDS allowlist. Anonymous and
// non-Discord identities can never be admins, regardless of env config.
export const isAdmin = (user: User | undefined): boolean => {
  if (!user || user.issuer !== "discord") return false
  return ADMIN_DISCORD_IDS.has(user.userId)
}

export const getEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable ${name}`)
  }
  return value
}

export const generateRaidId = (): string => {
  const characterSet = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789"
  let raidId = ""
  for (let i = 0; i < 5; i++) {
    raidId += characterSet[Math.floor(Math.random() * characterSet.length)]
  }
  return raidId
}

export const setAuthCookie = (c: Context, cookie: string) => {
  setCookie(c, "auth", cookie, {
    secure: true,
    domain: DOMAIN,
    httpOnly: true,
    sameSite: "Lax",
    expires: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 400), // 400 days expiration
  })
}

export const getOrCreateUser = async (
  c: Context,
  reset = false,
): Promise<User> => {
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
