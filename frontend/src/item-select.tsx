import { useState } from "react"
import type { Attendee, Class, Item, User } from "../types/types.ts"
import { Button, Group, Paper, Stack, Text } from "@mantine/core"
import "../css/tooltip.css"
import { ItemPicker } from "./item-picker.tsx"
import { SelectableItem } from "./item.tsx"
export const ItemSelect = (
  {
    value,
    label,
    onChange,
    items,
    selectedClass,
    user,
    attendees,
    itemLimit,
    hardReserves = [],
    allowDuplicates = false,
  }: {
    value: number[]
    label: string
    onChange: (itemIds: number[]) => void
    items: Item[]
    selectedClass?: Class | null
    user?: User
    attendees?: Attendee[]
    itemLimit?: number
    hardReserves?: number[]
    allowDuplicates?: boolean
  },
) => {
  const [itemPickerOpen, setItemPickerOpen] = useState<boolean>(false)
  return (
    <Stack gap={0}>
      <Group mb={3} p={0} gap={3}>
        <Text size="sm">
          {label}
        </Text>
        <Text
          size="sm"
          c="var(--mantine-color-error)"
          hidden={itemLimit ? value.length == itemLimit : value.length > 0}
        >
          *
        </Text>
      </Group>
      <Paper
        p="sm"
        shadow="sm"
        style={{ backgroundColor: "var(--mantine-color-dark-8" }}
      >
        <Stack gap="sm" justify="bottom">
          {value.map((itemId) => (
            <SelectableItem
              item={items.filter((i) => i.id == itemId)[0]}
              onRightSectionClick={() => {
                const idx = value.indexOf(itemId)
                if (idx !== -1) {
                  onChange([
                    ...value.slice(0, idx),
                    ...value.slice(idx + 1),
                  ])
                }
              }}
              onClick={() => setItemPickerOpen(true)}
              onDuplicateClick={() => onChange([...value, itemId])}
              deleteMode
              duplicateMode={allowDuplicates}
              user={user}
              attendees={attendees}
            />
          ))}
          {Array.from({
            length: itemLimit ? (itemLimit - value.length) : 1,
          })
            .map((_, i) => (
              <Button
                fullWidth
                h={36}
                onClick={() => setItemPickerOpen(true)}
                variant="default"
              >
                {itemLimit
                  ? `Select item ${value.length + i + 1}`
                  : "Select item(s)"}
              </Button>
            ))}
          <Text
            size="sm"
            c="var(--mantine-color-error)"
            hidden={value.length <= (itemLimit || Infinity)}
          >
            You must SR exactly {itemLimit} item(s)
          </Text>
        </Stack>
      </Paper>
      <ItemPicker
        selectedItemIds={value}
        setSelectedItemIds={onChange}
        items={items}
        open={itemPickerOpen}
        setOpen={setItemPickerOpen}
        selectedClass={selectedClass || null}
        user={user}
        attendees={attendees}
        selectMode={true}
        hardReserves={hardReserves}
      />
    </Stack>
  )
}
