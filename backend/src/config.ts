import process from "node:process"
import { getEnv } from "./utils.ts"

export const PORT = process.env["PORT"]
export const DOMAIN = getEnv("DOMAIN")
export const SCHEME = getEnv("SCHEME")
export const JWT_SECRET = getEnv("JWT_SECRET")

export const DISCORD_LOGIN_ENABLED =
  process.env["DISCORD_LOGIN_ENABLED"] === "true"
export const DISCORD_CLIENT_ID = DISCORD_LOGIN_ENABLED
  ? getEnv("DISCORD_CLIENT_ID")
  : ""
export const DISCORD_CLIENT_SECRET = DISCORD_LOGIN_ENABLED &&
  getEnv("DISCORD_CLIENT_SECRET")
export const DISCORD_API_ENDPOINT = "https://discord.com/api/v10"

export const DISCORD_REDIRECT_URI = `${SCHEME}://${DOMAIN}${
  PORT ? `:${PORT}` : ""
}/api/discord`

// Comma-separated Discord user IDs that grant site-wide admin (stats panel,
// future admin tools). Mirrors the ADMIN_DISCORD_IDS pattern on epoglogs.com.
// Unset = no admins (admin endpoints return 403 to everyone).
export const ADMIN_DISCORD_IDS: Set<string> = new Set(
  (process.env["ADMIN_DISCORD_IDS"] || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0),
)
