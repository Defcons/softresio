// Unit tests for the Discord login's state check and the first-login raid move.
// Run from backend/: deno test ../tests/
import {
  canMoveRaids,
  checkOAuthState,
  newOAuthState,
  safeReturnPath,
} from "../backend/src/login.ts"

const eq = (got: unknown, want: unknown, what: string) => {
  if (got !== want) {
    throw new Error(
      `${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`,
    )
  }
}

Deno.test("safeReturnPath keeps a path on this site", () => {
  eq(safeReturnPath("/"), "/", "root")
  eq(safeReturnPath("/SR/ABCDE"), "/SR/ABCDE", "a raid page")
  eq(safeReturnPath("/raid?x=1"), "/raid?x=1", "with a query")
})

Deno.test("safeReturnPath refuses other hosts and odd input", () => {
  for (
    const bad of [
      undefined,
      "",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\t/evil.example",
      "/a\nb",
      "evil",
    ]
  ) {
    eq(safeReturnPath(bad), "/", JSON.stringify(bad))
  }
})

Deno.test("a state from newOAuthState checks out and returns its page", () => {
  const { state, cookie } = newOAuthState("/SR/ABCDE")
  eq(checkOAuthState(cookie, state), "/SR/ABCDE", "matching state")
})

Deno.test("checkOAuthState refuses a missing or foreign state", () => {
  const { state, cookie } = newOAuthState("/SR/ABCDE")
  const other = newOAuthState("/SR/ABCDE")
  eq(checkOAuthState(undefined, state), null, "no cookie (login CSRF)")
  eq(checkOAuthState(cookie, undefined), null, "no state")
  eq(checkOAuthState(cookie, ""), null, "empty state")
  eq(checkOAuthState(cookie, other.state), null, "another browser's state")
  eq(checkOAuthState("|/x", ""), null, "empty state in the cookie")
  eq(checkOAuthState("garbage", "garbage"), null, "a cookie with no page")
})

Deno.test("checkOAuthState never returns another host", () => {
  const { state, cookie } = newOAuthState("//evil.example")
  eq(checkOAuthState(cookie, state), "/", "made with a foreign page")
  eq(checkOAuthState("s|//evil.example", "s"), "/", "a hand-made cookie")
})

Deno.test("canMoveRaids moves only an anonymous identity's raids", () => {
  const anon = {
    userId: "00000000-0000-4000-8000-000000000001",
    issuer: "softres.epoglogs.com",
  }
  const discordUser = { userId: "100000000000000001", issuer: "discord" }
  eq(
    canMoveRaids(anon, "999999999999999999", 0),
    true,
    "anonymous to a new account",
  )
  eq(canMoveRaids(anon, "999999999999999999", "0"), true, "count as a string")
  eq(
    canMoveRaids(anon, "999999999999999999", "3"),
    false,
    "the account has raids",
  )
  eq(
    canMoveRaids(discordUser, "999999999999999999", 0),
    false,
    "another Discord account",
  )
  eq(canMoveRaids(anon, anon.userId, 0), false, "the same id")
})
