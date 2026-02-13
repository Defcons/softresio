import process from "node:process"
import { getCookie, setCookie } from "hono/cookie"
import type { Context } from "hono"
import { DOMAIN, JWT_SECRET } from "./config.ts"
import { User } from "../shared/types.ts"
import * as jwt from "hono/jwt"
import { randomUUID } from "node:crypto"

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
