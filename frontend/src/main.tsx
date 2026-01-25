import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "../css/index.css"
import { CreateRaid } from "./create-raid.tsx"
import { Raid } from "./raid.tsx"
import { MyRaids } from "./my-raids.tsx"
import { LootBrowser } from "./loot-browser.tsx"
import "@mantine/core/styles.css"
import "@mantine/dates/styles.css"
import { Box, createTheme, Grid, MantineProvider } from "@mantine/core"
import { Menu } from "./menu.tsx"
import { BrowserRouter, Route, Routes } from "react-router"

const theme = createTheme({
  primaryColor: "orange",
})

function App() {
  return (
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <BrowserRouter>
        <Box h="100dvh">
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
        </Box>
      </BrowserRouter>
    </MantineProvider>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
