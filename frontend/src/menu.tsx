import { useEffect, useRef, useState } from "react"
import type { SignOutResponse, User } from "../shared/types.ts"
import { Link, NavLink, useNavigate } from "react-router"

// Mirrors epoglogs.com's auth widget exactly — avatar + username + logout icon.
// The original lives in /js/auth.js renderLoggedIn; this is the React version
// rendering the same DOM.
const DEFAULT_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png"

const AuthWidget = (
  {
    enabled,
    user,
    signOut,
    login,
  }: {
    enabled: boolean
    user: User
    signOut: () => void
    login: () => void
  },
) => {
  if (!enabled) return null

  if (user?.issuer != "discord") {
    return (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault()
          login()
        }}
        className="header-rankings-btn"
        title="Login with Discord"
        style={{ color: "#7289da" }}
      >
        💬 Login
      </a>
    )
  }

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png?size=64`
    : DEFAULT_AVATAR

  return (
    <div
      className="auth-user"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 6px",
        color: "var(--text-muted)",
        fontSize: 12,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "inherit",
          textDecoration: "none",
        }}
      >
        <img
          src={avatarUrl}
          alt=""
          width={22}
          height={22}
          style={{ borderRadius: "50%", border: "1px solid var(--border)" }}
        />
        <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
          {user.username}
        </span>
      </span>
      <button
        type="button"
        onClick={signOut}
        title="Log out"
        style={{
          background: "none",
          border: "none",
          color: "var(--text-muted)",
          cursor: "pointer",
          fontSize: 14,
          padding: "2px 4px",
          lineHeight: 1,
        }}
      >
        ⏻
      </button>
    </div>
  )
}

// Tools dropdown — click to open, click outside / ESC to close. Mirrors the
// .header-tools-wrap behaviour from epoglogs/js/utils.js (the .open class on
// the wrapper toggles the menu).
const ToolsMenu = () => {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div
      ref={wrapRef}
      className={`header-tools-wrap${open ? " open" : ""}`}
    >
      <button
        type="button"
        className="header-rankings-btn header-tools-btn"
        title="More tools"
        onClick={() => setOpen((v) => !v)}
      >
        🛠 Tools <span className="header-tools-arrow">▾</span>
      </button>
      <div className="header-tools-menu">
        <a href="https://epoglogs.com">⚔ Epog Logs</a>
        <a href="https://epoglogs.com/rankings.html">🏆 Rankings</a>
        <a href="https://epoglogs.com/meta.html">📊 Meta</a>
        <a href="https://epoglogs.com/progression.html">🏁 Progression</a>
        <a href="https://epoglogs.com/talents.html">🎯 Talents</a>
        <a href="https://epoglogs.com/armory">🛡 Armory</a>
      </div>
    </div>
  )
}

// React-router NavLink callback assigns `header-rankings-btn active` to the
// current route's nav button — same pattern as epoglogs's utils.js
// activateCurrentNav helper.
const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "header-rankings-btn active" : "header-rankings-btn"

export const Menu = (
  { user, setUser, discordClientId, discordLoginEnabled, isAdmin }: {
    user: User
    setUser: (user: User) => void
    discordClientId: string
    discordLoginEnabled: boolean
    isAdmin?: boolean
  },
) => {
  const navigate = useNavigate()

  const login = () => {
    const { protocol, hostname, port, pathname } = globalThis.location
    const redirectUrl = `${protocol}//${hostname}${
      hostname == "localhost" ? `:${port}` : ""
    }/api/discord`
    globalThis.open(
      `https://discord.com/oauth2/authorize?client_id=${discordClientId}&response_type=code&redirect_uri=${redirectUrl}&scope=identify&state=${pathname}`,
      "_self",
    )
  }

  const signOut = () => {
    fetch("/api/signout").then((r) => r.json()).then(
      (j: SignOutResponse) => {
        if (j.error) {
          alert(j.error.message)
        } else if (j.user) {
          setUser(j.user)
        }
      },
    )
  }

  // useNavigate isn't strictly needed here anymore (NavLink handles routing)
  // but keep it imported in case future menu items need programmatic nav.
  void navigate

  return (
    <header>
      <div className="header-inner">
        <h1>
          <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>
            ⚔ Epog Logs
          </Link>
        </h1>
        <NavLink to="/raids" className={navClass}>
          📋 My Raids
        </NavLink>
        <NavLink to="/loot" className={navClass}>
          🎁 Loot Browser
        </NavLink>
        <NavLink to="/create" className={navClass}>
          ✚ Create Raid
        </NavLink>
        {isAdmin
          ? (
            <NavLink to="/admin" className={navClass} title="Site stats">
              🛠 Admin
            </NavLink>
          )
          : null}
        <ToolsMenu />
        <AuthWidget
          enabled={discordLoginEnabled}
          user={user}
          signOut={signOut}
          login={login}
        />
      </div>
    </header>
  )
}
