import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "../css/index.css"
import { CreateRaid } from "./create-raid.tsx"
import { Raid } from "./raid.tsx"
import { MyRaids } from "./my-raids.tsx"
import { LootBrowser } from "./loot-browser.tsx"
import "@mantine/core/styles.css"
import "@mantine/dates/styles.css"
import { ModalsProvider } from "@mantine/modals"
import {
  IconBrandDiscordFilled,
  IconBrandGithubFilled,
} from "@tabler/icons-react"
import {
  Anchor,
  createTheme,
  Divider,
  Grid,
  Group,
  MantineProvider,
  Stack,
} from "@mantine/core"
import { Menu } from "./menu.tsx"
import { BrowserRouter, Route, Routes } from "react-router"

const theme = createTheme({
  primaryColor: "orange",
})

function App() {
  return (
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <ModalsProvider>
        <BrowserRouter>
          <Stack h="100dvh" justify="space-between">
            <Stack>
              <Menu />
              <Grid gutter={0} justify="center">
                <Grid.Col span={{ base: 11, md: 4, xl: 4 }}>
                  <Routes>
                    <Route path="/" element={<MyRaids />} />
                    <Route path="/create" element={<CreateRaid />} />
                    <Route path="/:raidId" element={<Raid />} />;
                    <Route path="/raids" element={<MyRaids />} />;
                    <Route path="/loot" element={<LootBrowser />} />;
                  </Routes>
                </Grid.Col>
              </Grid>
            </Stack>
            <Stack>
              <Divider />
              <Group gap="sm" mb="md" justify="center">
                <Group mx="lg">
                  <IconBrandGithubFilled size={20} color="grey" />
                  <Anchor
                    href="https://github.com/kofoednielsen/softresio"
                    underline="never"
                    c="grey"
                  >
                    This project is open-source
                  </Anchor>
                </Group>
                <Group mx="lg">
                  <IconBrandDiscordFilled size={20} color="grey" />
                  <Anchor
                    href="https://discord.gg/DbfRrGGQ7J"
                    underline="never"
                    c="grey"
                  >
                    Give feedback on Discord
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
