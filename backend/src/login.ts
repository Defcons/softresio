import { randomUUID } from "node:crypto"

// The Discord login's `state`: /api/discord/login makes a random one, keeps it
// in this short-lived cookie with the page to return to, and /api/discord only
// finishes a login whose `state` matches the cookie. Without it, anyone could
// send a victim's browser through the callback with the attacker's own code.
export const OAUTH_STATE_COOKIE = "oauth_state"
export const OAUTH_STATE_MAX_AGE = 600 // seconds

// A path on this site, or "/". Rejects "//host" and "/\host" (which browsers
// read as another host) and control characters (which browsers strip).
export const safeReturnPath = (path: string | undefined): string =>
  path && /^\/(?![/\\])[^\x00-\x1f\x7f]*$/.test(path) ? path : "/"

export const newOAuthState = (
  returnPath: string | undefined,
): { state: string; cookie: string } => {
  const state = randomUUID()
  return { state, cookie: `${state}|${safeReturnPath(returnPath)}` }
}

// The page to return to when `state` matches the cookie, else null.
export const checkOAuthState = (
  cookie: string | undefined,
  state: string | undefined,
): string | null => {
  if (!cookie || !state) return null
  const bar = cookie.indexOf("|")
  if (bar <= 0 || cookie.slice(0, bar) !== state) return null
  return safeReturnPath(cookie.slice(bar + 1))
}

// The first Discord login moves the raids of the browser's anonymous identity
// onto the Discord one. Never move them off another Discord identity: that
// would hand a logged-in user's raids to whichever account logged in last.
export const canMoveRaids = (
  oldUser: { userId: string; issuer: string },
  newUserId: string,
  newUserRaids: number | string,
): boolean =>
  oldUser.issuer !== "discord" && oldUser.userId !== newUserId &&
  Number(newUserRaids) === 0
