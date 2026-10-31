// Unit tests for the size, rate and cache limits, the SR rules, the response
// headers and the handling of a bad login cookie.
// Run from backend/: deno test --allow-env ../tests/
import { Hono } from "hono"
import { RateLimiter, TtlCache } from "../backend/src/limits.ts"
import { MAX_ATTENDEES, srRefusal } from "../backend/src/sr-rules.ts"
import {
  limitPosts,
  MAX_BODY_BYTES,
  securityHeaders,
} from "../backend/src/guards.ts"

const eq = (got: unknown, want: unknown, what: string) => {
  if (got !== want) {
    throw new Error(
      `${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`,
    )
  }
}

Deno.test("RateLimiter allows the limit per window, per key", () => {
  const r = new RateLimiter(3, 1000)
  for (let i = 0; i < 3; i++) eq(r.allow("a", 0), true, `call ${i + 1}`)
  eq(r.allow("a", 10), false, "fourth call")
  eq(r.allow("b", 10), true, "another key")
  eq(r.allow("a", 1000), true, "a new window")
})

Deno.test("RateLimiter keeps its table bounded", () => {
  const r = new RateLimiter(1, 1000, 3)
  for (const k of ["a", "b", "c", "d", "e"]) eq(r.allow(k, 0), true, k)
  // The table was emptied when full, so "a" is counted afresh.
  eq(r.allow("e", 1), false, "a recent key is still counted")
})

Deno.test("TtlCache expires and evicts the oldest", () => {
  const c = new TtlCache<number>(1000, 2)
  c.set("a", 1, 0)
  eq(c.get("a", 999), 1, "fresh")
  eq(c.get("a", 1000), undefined, "expired")
  c.set("a", 1, 0)
  c.set("b", 2, 0)
  c.set("c", 3, 0)
  eq(c.get("a", 1), undefined, "oldest evicted")
  eq(c.get("c", 1), 3, "newest kept")
  c.clear()
  eq(c.get("c", 1), undefined, "cleared")
})

const raid = (
  attendees: [string, string][],
  srCount = 2,
) => ({
  srCount,
  attendees: attendees.map(([name, userId]) => ({
    character: { name },
    user: { userId },
  })),
})

Deno.test("srRefusal: another attendee's character is refused", () => {
  const r = raid([["Bob", "user-a"]])
  eq(srRefusal(r, "user-b", "Bob", 1)?.status, 403, "other user, same name")
  eq(srRefusal(r, "user-a", "Bob", 1), null, "the owner may change it")
  eq(srRefusal(r, "user-b", "Alice", 1), null, "another name is free")
})

Deno.test("srRefusal: item count and full raid", () => {
  const r = raid([["Bob", "user-a"]], 2)
  eq(srRefusal(r, "user-a", "Bob", 2), null, "at the raid's limit")
  eq(srRefusal(r, "user-a", "Bob", 3)?.status, 400, "over the raid's limit")
  const many = raid(
    Array.from({ length: MAX_ATTENDEES }, (_, i) => [`N${i}`, `u${i}`]),
  )
  eq(srRefusal(many, "new-user", "New", 1)?.status, 400, "full raid")
  eq(srRefusal(many, "u3", "N3", 1), null, "an attendee in a full raid")
})

const guarded = () => {
  const app = new Hono()
  app.use("*", securityHeaders)
  app.post("/api/*", limitPosts)
  app.post("/api/echo", async (c) => c.json(await c.req.json()))
  app.get("/page", (c) => c.text("hello"))
  return app
}
const post = (app: Hono, body: string, ip = "1.1.1.1") =>
  app.request("/api/echo", {
    method: "POST",
    body,
    headers: { "cf-connecting-ip": ip, "content-type": "application/json" },
  })

Deno.test("responses carry the security headers", async () => {
  const res = await guarded().request("/page")
  eq(res.headers.get("x-content-type-options"), "nosniff", "nosniff")
  eq(res.headers.get("x-frame-options"), "SAMEORIGIN", "frame options")
  eq(
    res.headers.get("content-security-policy")?.includes("frame-ancestors"),
    true,
    "csp",
  )
})

Deno.test("a POST over the size limit is refused with 413", async () => {
  const app = guarded()
  eq((await post(app, JSON.stringify({ a: 1 }))).status, 200, "small body")
  const big = JSON.stringify({ a: "x".repeat(MAX_BODY_BYTES) })
  eq((await post(app, big)).status, 413, "big body")
})

Deno.test("POSTs from one address are limited, others are not", async () => {
  const app = guarded()
  for (let i = 0; i < 120; i++) await post(app, "{}", "9.9.9.9")
  eq((await post(app, "{}", "9.9.9.9")).status, 429, "121st call")
  eq((await post(app, "{}", "8.8.8.8")).status, 200, "another address")
})

Deno.test("a bad auth cookie is an anonymous visit, not an error", async () => {
  Deno.env.set("DOMAIN", "test.example")
  Deno.env.set("SCHEME", "https")
  Deno.env.set("JWT_SECRET", "test-secret-test-secret")
  await import("../backend/src/config.ts") // before utils.ts, as main.ts does
  const { getOrCreateUser } = await import("../backend/src/utils.ts")
  const jwt = await import("hono/jwt")
  const app = new Hono()
  app.get("/me", async (c) => c.json(await getOrCreateUser(c)))

  const bad = await app.request("/me", {
    headers: { cookie: "auth=not-a-token" },
  })
  eq(bad.status, 200, "garbage cookie")
  eq(typeof (await bad.json()).userId, "string", "gets an anonymous user")
  eq(bad.headers.get("set-cookie")?.startsWith("auth="), true, "new cookie")

  const other = await jwt.sign(
    { userId: "x".repeat(20), issuer: "a" },
    "other-secret-other-secret",
    "HS256",
  )
  const foreign = await app.request("/me", {
    headers: { cookie: `auth=${other}` },
  })
  eq(foreign.status, 200, "token from another secret")

  const mine = await jwt.sign(
    { userId: "u".repeat(20), issuer: "discord" },
    "test-secret-test-secret",
    "HS256",
  )
  const ok =
    await (await app.request("/me", { headers: { cookie: `auth=${mine}` } }))
      .json()
  eq(ok.userId, "u".repeat(20), "a good cookie keeps its user")
})
