import { Collapse, Paper, Stack } from "@mantine/core"
import type { Item } from "../shared/types.ts"
import { SelectableItem } from "./item.tsx"
import { nothingItem } from "./mock-item.ts"
export const HardReserves = (
  { hardReserves, items, show }: {
    hardReserves: number[]
    items: Item[]
    show: boolean
  },
) => (
  <Collapse in={show}>
    <Paper
      p="sm"
      shadow="sm"
      style={{ backgroundColor: "var(--mantine-color-dark-8" }}
    >
      <Stack gap="sm" justify="bottom">
        {hardReserves.map((itemId, index) => (
          <SelectableItem
            key={`${itemId}|${index}`}
            item={items.find((i) => i.id == itemId) || nothingItem}
            hideChance
            hardReserves={hardReserves}
          />
        ))}
      </Stack>
    </Paper>
  </Collapse>
)
