import { StrictMode, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import type { InfoResponse, User } from "../shared/types.ts"
import "../css/index.css"
import { CreateRaid } from "./create-raid.tsx"
import { CreateGuild } from "./create-guild.tsx"
import { RaidElement } from "./raid.tsx"
import { MyRaids } from "./my-raids.tsx"
import { LootBrowser } from "./loot-browser.tsx"
import "@mantine/core/styles.css"
import "@mantine/dates/styles.css"
import { ModalsProvider } from "@mantine/modals"
import { IconBrandGithubFilled } from "@tabler/icons-react"
import {
  Anchor,
  createTheme,
  Divider,
  Grid,
  Group,
  MantineProvider,
  Stack,
} from "@mantine/core"
import { useHover } from "@mantine/hooks"
import { Menu } from "./menu.tsx"
import { BrowserRouter, Route, Routes } from "react-router"

// Epog Logs gold palette — anchored on #c89b3c (epoglogs --accent), 10 shades
// generated from light → dark to match Mantine's color contract.
const theme = createTheme({
  primaryColor: "epogGold",
  cursorType: "pointer",
  colors: {
    epogGold: [
      "#fbf6e9",
      "#f3e7c4",
      "#ead69c",
      "#e0c473",
      "#d8b452",
      "#d2a93e",
      "#c89b3c",
      "#a87f2c",
      "#876520",
      "#6a4d16",
    ],
  },
})

function App() {
  const { hovered: githubHovered, ref: githubRef } = useHover()
  const [user, setUser] = useState<User>()
  const [discordClientId, setDiscordClientId] = useState<string>()
  const [discordLoginEnabled, setDiscordLoginEnabled] = useState<boolean>()

  useEffect(() => {
    fetch("/api/info").then((r) => r.json()).then(
      (j: InfoResponse) => {
        if (j.error) {
          alert(j.error.message)
        } else if (j.data) {
          setDiscordLoginEnabled(j.data.discordLoginEnabled)
          setDiscordClientId(j.data.discordClientId)
          setUser(j.user)
        }
      },
    )
  }, [])

  return (
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <ModalsProvider>
        <BrowserRouter>
          <Stack h="100dvh" justify="space-between">
            {user && discordLoginEnabled !== undefined
              ? (
                <Stack>
                  <Menu
                    user={user}
                    setUser={setUser}
                    discordClientId={discordClientId || ""}
                    discordLoginEnabled={discordLoginEnabled}
                  />
                  <Grid gutter={0} justify="center">
                    <Grid.Col span={{ base: 11, md: 4, xl: 4 }}>
                      <Routes>
                        <Route path="/" element={<MyRaids user={user} />} />
                        <Route path="/guild/create" element={<CreateGuild />} />
                        <Route path="/create" element={<CreateRaid />} />
                        <Route
                          path="/create/items"
                          element={<CreateRaid itemPickerOpen />}
                        />
                        <Route path="/copy/:raidId" element={<CreateRaid />} />
                        <Route
                          path="/copy/:raidId/items"
                          element={<CreateRaid itemPickerOpen />}
                        />
                        <Route
                          path="/edit/:raidId"
                          element={<CreateRaid edit={true} />}
                        />
                        <Route
                          path="/edit/:raidId/items"
                          element={<CreateRaid itemPickerOpen />}
                        />
                        <Route
                          path="/:raidId"
                          element={<RaidElement user={user} />}
                        />
                        <Route
                          path="/:raidId/items"
                          element={<RaidElement user={user} itemPickerOpen />}
                        />
                        <Route
                          path="/raids"
                          element={<MyRaids user={user} />}
                        />
                        <Route path="/loot" element={<LootBrowser />} />
                        <Route
                          path="/loot/items"
                          element={<LootBrowser itemPickerOpen />}
                        />
                      </Routes>
                    </Grid.Col>
                  </Grid>
                </Stack>
              )
              : null}
            <Stack>
              <Divider />
              <Group gap="sm" mb="md" justify="center">
                <Group gap="xs" mx="lg" ref={githubRef}>
                  <IconBrandGithubFilled
                    size={18}
                    color={githubHovered
                      ? "var(--mantine-primary-color-filled)"
                      : "grey"}
                  />
                  <Anchor
                    size="sm"
                    href="https://github.com/Defcons/softresio"
                    underline="never"
                    c={githubHovered ? "lightgray" : "grey"}
                  >
                    Source (AGPL-3.0) — fork of softres.io
                  </Anchor>
                </Group>
                <Group gap="xs" mx="lg">
                  <Anchor
                    size="sm"
                    href="https://epoglogs.com"
                    underline="never"
                    c="grey"
                  >
                    ← Back to Epog Logs
                  </Anchor>
                </Group>
              </Group>
            </Stack>
          </Stack>
        </BrowserRouter>
      </ModalsProvider>
    </MantineProvider>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
