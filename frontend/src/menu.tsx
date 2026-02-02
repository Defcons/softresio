import {
  Badge,
  Box,
  Burger,
  Button,
  Divider,
  Drawer,
  Group,
  Image,
  ScrollArea,
  Stack,
  Tooltip,
} from "@mantine/core"
import type { SignOutResponse, User } from "../shared/types.ts"
import { useDisclosure } from "@mantine/hooks"
import logo from "./assets/logo-orange.png"
import classes from "../css/menu.module.css"
import { NavLink, useNavigate } from "react-router"
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

const MenuButtons = (
  { mobile, closeDrawer }: { mobile?: boolean; closeDrawer?: () => void },
) => {
  const navigate = useNavigate()

  return (
    <>
      <Tooltip label="Do not expect data persistance or features to work">
        <Badge color="red" radius="xs">Early Beta</Badge>
      </Tooltip>
      <Button
        variant="default"
        fullWidth={mobile}
        onClick={() => {
          navigate("raids")
          closeDrawer?.()
        }}
      >
        My Raids
      </Button>
      <Button
        variant="default"
        fullWidth={mobile}
        onClick={() => {
          navigate("loot")
          closeDrawer?.()
        }}
      >
        Loot Browser
      </Button>
      <Button
        fullWidth={mobile}
        onClick={() => {
          navigate("create")
          closeDrawer?.()
        }}
      >
        Create raid
      </Button>
    </>
  )
}

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
          alert(j.error)
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
          <Group>
            <NavLink to="/">
              <Image src={logo} h={40} w="auto" />
            </NavLink>
            <Group visibleFrom="sm">
              <MenuButtons />
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
              hiddenFrom="sm"
            />
          </Group>
        </Group>
      </header>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="100%"
        padding="md"
        hiddenFrom="sm"
        zIndex={1000000}
      >
        <ScrollArea h="calc(100vh - 80px" mx="-md">
          <Stack justify="center" pb="xl" px="md">
            <MenuButtons mobile closeDrawer={closeDrawer} />
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
/* <IconChevronDown size={16} color={theme.colors.blue[6]} /> */
