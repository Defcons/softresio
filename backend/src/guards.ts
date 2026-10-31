import type { Context, MiddlewareHandler } from "hono"
import { bodyLimit } from "hono/body-limit"
import { getConnInfo } from "hono/deno"
import { RateLimiter } from "./limits.ts"

export const MAX_BODY_BYTES = 16 * 1024

// Who is calling: the address Cloudflare saw, else the proxy's forwarded one, else the socket's.
export const clientKey = (c: Context): string => {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0].trim()
  const header = c.req.header("cf-connecting-ip") || forwarded ||
    c.req.header("x-real-ip")
  if (header) return header
  try {
    return getConnInfo(c).remote.address || "unknown"
  } catch {
    return "unknown"
  }
}

const tooMany = (c: Context) => {
  c.header("Retry-After", "60")
  return c.json(
    { error: { message: "Too many requests, try again in a minute" } },
    429,
  )
}

// Every POST: a small body and a generous number of calls per minute from one address.
const postLimiter = new RateLimiter(120, 60_000)
const limitBody = bodyLimit({
  maxSize: MAX_BODY_BYTES,
  onError: (c) =>
    c.json({ error: { message: "The request is too large" } }, 413),
})

export const limitPosts: MiddlewareHandler = async (c, next) => {
  if (!postLimiter.allow(clientKey(c))) return tooMany(c)
  return await limitBody(c, next)
}

// New raids and guilds: far fewer than any raid leader needs.
const creationLimiter = new RateLimiter(20, 60 * 60_000)
export const allowCreation = (c: Context): boolean =>
  creationLimiter.allow(clientKey(c))

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next()
  // The WebSocket upgrade response is not ours to change.
  if (c.req.path.startsWith("/api/ws/")) return
  const headers = c.res.headers
  headers.set("X-Content-Type-Options", "nosniff")
  headers.set("X-Frame-Options", "SAMEORIGIN")
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  // Only the directives that do not touch what the page loads (the ad script, icons, item links).
  headers.set(
    "Content-Security-Policy",
    "base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
  )
}
