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
import { createTheme, Grid, MantineProvider, Stack } from "@mantine/core"
import { Menu } from "./menu.tsx"
import { BrowserRouter, Link, Route, Routes } from "react-router"
import { About, Privacy, Terms } from "./legal.tsx"
import { AdSlot } from "./ad-slot.tsx"
import { AdminPanel } from "./admin.tsx"

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
  const [user, setUser] = useState<User>()
  const [discordClientId, setDiscordClientId] = useState<string>()
  const [discordLoginEnabled, setDiscordLoginEnabled] = useState<boolean>()
  const [isAdmin, setIsAdmin] = useState<boolean>(false)

  useEffect(() => {
    fetch("/api/info").then((r) => r.json()).then(
      (j: InfoResponse) => {
        if (j.error) {
          alert(j.error.message)
        } else if (j.data) {
          setDiscordLoginEnabled(j.data.discordLoginEnabled)
          setDiscordClientId(j.data.discordClientId)
          setIsAdmin(j.data.isAdmin)
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
                    isAdmin={isAdmin}
                  />
                  <Routes>
                    <Route
                      path="/admin"
                      element={
                        <div
                          style={{
                            maxWidth: 1300,
                            margin: "0 auto",
                            width: "100%",
                          }}
                        >
                          <AdminPanel isAdmin={isAdmin} />
                        </div>
                      }
                    />
                  </Routes>
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
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/about" element={<About />} />
                      </Routes>
                      <AdSlot placement="inContent" />
                    </Grid.Col>
                  </Grid>
                </Stack>
              )
              : null}
            <footer className="epog-footer">
              <span>© 2026 Epog Logs</span>
              <span className="sep">·</span>
              <span>Made by Defcon</span>
              <span className="sep">·</span>
              <Link to="/about">About</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
              <span className="sep">·</span>
              <a
                href="https://github.com/Defcons/softresio"
                target="_blank"
                rel="noopener"
              >
                Source (AGPL-3.0)
              </a>
              <span className="sep">·</span>
              <a href="https://epoglogs.com">← Back to Epog Logs</a>
            </footer>
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
