import {
  Badge,
  Box,
  Burger,
  Button,
  Divider,
  Drawer,
  Group,
  ScrollArea,
  Stack,
  Tooltip,
} from "@mantine/core"
import type { SignOutResponse, User } from "../shared/types.ts"
import { useDisclosure } from "@mantine/hooks"
import classes from "../css/menu.module.css"
import { Link, useNavigate } from "react-router"

// Mirrors the .auth-user widget on epoglogs.com: avatar + username + ⏻ logout
// button when logged in via Discord, or a single 💬 Login link when anonymous.
// Falls back to Discord's default grey avatar when the user has no custom one.
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
      <button
        type="button"
        className="epog-pill"
        onClick={login}
        title="Login with Discord"
        style={{ color: "#7289da" }}
      >
        💬 Login
      </button>
    )
  }

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png?size=64`
    : DEFAULT_AVATAR

  return (
    <div className="epog-auth-user">
      <img
        src={avatarUrl}
        alt=""
        width={22}
        height={22}
        className="epog-auth-avatar"
      />
      <span className="epog-auth-name">{user.username}</span>
      <button
        type="button"
        onClick={signOut}
        title="Log out"
        className="epog-auth-logout"
      >
        ⏻
      </button>
    </div>
  )
}

const PrimaryNav = (
  { mobile, closeDrawer }: { mobile?: boolean; closeDrawer?: () => void },
) => {
  const navigate = useNavigate()
  const go = (path: string) => () => {
    navigate(path)
    closeDrawer?.()
  }

  if (mobile) {
    return (
      <>
        <Tooltip label="If you experience any issues please let us know">
          <Badge color="epogGold" radius="xs">Beta</Badge>
        </Tooltip>
        <Button variant="default" fullWidth onClick={go("raids")}>
          My Raids
        </Button>
        <Button variant="default" fullWidth onClick={go("loot")}>
          Loot Browser
        </Button>
        <Button fullWidth onClick={go("create")}>Create Raid</Button>
      </>
    )
  }

  return (
    <Group gap="xs">
      <Tooltip label="If you experience any issues please let us know">
        <Badge color="epogGold" radius="xs">Beta</Badge>
      </Tooltip>
      <button type="button" className="epog-pill" onClick={go("raids")}>
        📋 My Raids
      </button>
      <button type="button" className="epog-pill" onClick={go("loot")}>
        🎁 Loot Browser
      </button>
      <button type="button" className="epog-pill" onClick={go("create")}>
        ✚ Create Raid
      </button>
      <ToolsMenu />
    </Group>
  )
}

// Tools menu mirrors the epoglogs.com header — but flipped: from softres,
// these links send users *back* into the epoglogs ecosystem.
const ToolsMenu = () => (
  <div className="epog-tools-wrap">
    <button type="button" className="epog-pill">🛠 Tools ▾</button>
    <div className="epog-tools-menu">
      <a href="https://epoglogs.com" target="_blank" rel="noopener">
        ⚔ Epog Logs
      </a>
      <a
        href="https://epoglogs.com/rankings.html"
        target="_blank"
        rel="noopener"
      >
        🏆 Rankings
      </a>
      <a href="https://epoglogs.com/meta.html" target="_blank" rel="noopener">
        📊 Meta
      </a>
      <a
        href="https://epoglogs.com/progression.html"
        target="_blank"
        rel="noopener"
      >
        🏁 Progression
      </a>
      <a
        href="https://epoglogs.com/talents.html"
        target="_blank"
        rel="noopener"
      >
        🎯 Talents
      </a>
      <a href="https://epoglogs.com/armory" target="_blank" rel="noopener">
        🛡 Armory
      </a>
    </div>
  </div>
)

export const Menu = (
  { user, setUser, discordClientId, discordLoginEnabled }: {
    user: User
    setUser: (user: User) => void
    discordClientId: string
    discordLoginEnabled: boolean
  },
) => {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false)

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

  return (
    <Box pb={20}>
      <header className={classes.header}>
        <Group justify="space-between" h="100%">
          <Group gap="md">
            <Link to="/" className="epog-brand">⚔ Epog Logs</Link>
            <Group visibleFrom="md">
              <PrimaryNav />
            </Group>
          </Group>
          <Group>
            <Box visibleFrom="sm">
              <AuthWidget
                enabled={discordLoginEnabled}
                user={user}
                signOut={signOut}
                login={login}
              />
            </Box>
            <Burger
              size="sm"
              opened={drawerOpened}
              onClick={toggleDrawer}
              hiddenFrom="md"
            />
          </Group>
        </Group>
      </header>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="100%"
        padding="md"
        hiddenFrom="md"
        zIndex={1000000}
      >
        <ScrollArea h="calc(100vh - 80px" mx="-md">
          <Stack justify="center" pb="xl" px="md">
            <PrimaryNav mobile closeDrawer={closeDrawer} />
            <Divider />
            <AuthWidget
              enabled={discordLoginEnabled}
              user={user}
              login={login}
              signOut={signOut}
            />
          </Stack>
        </ScrollArea>
      </Drawer>
    </Box>
  )
}
