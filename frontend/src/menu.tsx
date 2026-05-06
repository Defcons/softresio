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
import { IconBrandDiscordFilled } from "@tabler/icons-react"

const LoginSignOutButton = (
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
) => (
  enabled
    ? (
      <Button
        onClick={user?.issuer == "discord" ? signOut : login}
        color={user?.issuer != "discord" ? "#5865F2" : ""}
        variant={user?.issuer == "discord" ? "default" : ""}
        leftSection={user?.issuer != "discord"
          ? <IconBrandDiscordFilled size={16} />
          : undefined}
      >
        {user?.issuer == "discord" ? "Sign out" : "Login"}
      </Button>
    )
    : null
)

const PrimaryNav = (
  { mobile, closeDrawer, isAdmin }: {
    mobile?: boolean
    closeDrawer?: () => void
    isAdmin?: boolean
  },
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
        {isAdmin
          ? (
            <Button variant="default" fullWidth onClick={go("admin")}>
              🛠 Admin
            </Button>
          )
          : null}
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
      <button
        type="button"
        className="epog-pill is-primary"
        onClick={go("create")}
      >
        ✚ Create Raid
      </button>
      {isAdmin
        ? (
          <button
            type="button"
            className="epog-pill"
            onClick={go("admin")}
            title="Site stats — admin only"
          >
            🛠 Admin
          </button>
        )
        : null}
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
  { user, setUser, discordClientId, discordLoginEnabled, isAdmin }: {
    user: User
    setUser: (user: User) => void
    discordClientId: string
    discordLoginEnabled: boolean
    isAdmin?: boolean
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
            <Link to="/" className="epog-brand">
              ⚔ Epog Logs<span className="sub">📋 Soft Reserves</span>
            </Link>
            <Group visibleFrom="md">
              <PrimaryNav isAdmin={isAdmin} />
            </Group>
          </Group>
          <Group>
            <Tooltip label={user?.userId}>
              <Badge
                size="sm"
                color={user?.issuer == "discord"
                  ? "#5865F2"
                  : "var(--mantine-color-dark-5)"}
              >
                {user?.issuer == "discord" ? user.username : "Anonymous"}
              </Badge>
            </Tooltip>
            <Box visibleFrom="sm">
              <LoginSignOutButton
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
            <PrimaryNav
              mobile
              closeDrawer={closeDrawer}
              isAdmin={isAdmin}
            />
            <Divider />
            <LoginSignOutButton
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
