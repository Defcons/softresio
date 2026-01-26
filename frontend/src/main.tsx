import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "../css/index.css"
import { CreateRaid } from "./create-raid.tsx"
import { Raid } from "./raid.tsx"
import { MyRaids } from "./my-raids.tsx"
import { LootBrowser } from "./loot-browser.tsx"
import "@mantine/core/styles.css"
import "@mantine/dates/styles.css"
import { IconBrandDiscord, IconBrandGithub } from "@tabler/icons-react"
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
      <BrowserRouter>
        <Stack h="100dvh" justify="space-between">
          <Stack>
            <Menu />
            <Grid gutter={0} justify="center">
              <Grid.Col span={{ base: 11, md: 4, xl: 4 }}>
                <Routes>
                  <Route path="/" element={<CreateRaid />} />
                  <Route path="/create" element={<CreateRaid />} />
                  <Route path="/:raid_id" element={<Raid />} />;
                  <Route path="/raids" element={<MyRaids />} />;
                  <Route path="/loot" element={<LootBrowser />} />;
                </Routes>
              </Grid.Col>
            </Grid>
          </Stack>
          <Stack>
            <Divider />
            <Stack justify="center" gap="xs" ml="lg" mb="sm">
              <Group>
                <IconBrandGithub />
                <Anchor
                  size="lg"
                  href="https://github.com/kofoednielsen/softresio"
                  underline="never"
                  c="lightgray"
                >
                  This project is open-source
                </Anchor>
              </Group>
              <Group>
                <IconBrandDiscord />
                <Anchor
                  size="lg"
                  href="https://discord.gg/DbfRrGGQ7J"
                  underline="never"
                  c="lightgray"
                >
                  Give feedback on Discord
                </Anchor>
              </Group>
            </Stack>
          </Stack>
        </Stack>
      </BrowserRouter>
    </MantineProvider>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
