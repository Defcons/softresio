import type { Attendee, Class, Instance, User } from "../shared/types.ts"
import { removeOne } from "../shared/utils.ts"
import { Button, Group, Paper, Stack, Text } from "@mantine/core"
import "../css/tooltip.css"
import { ItemPicker } from "./item-picker.tsx"
import { SelectableItem } from "./item.tsx"
import { nothingItem } from "./mock-item.ts"
import { useNavigate } from "react-router"

export const ItemSelect = (
  {
    value,
    label,
    onChange,
    instance,
    selectedClass,
    user,
    attendees,
    itemLimit,
    hardReserves = [],
    sameItemLimit,
    itemPickerOpen,
  }: {
    value: number[]
    label: string
    onChange: (itemIds: number[]) => void
    instance: Instance
    selectedClass?: Class | null
    user?: User
    attendees?: Attendee[]
    itemLimit?: number
    hardReserves?: number[]
    sameItemLimit: number
    itemPickerOpen: boolean
  },
) => {
  const navigate = useNavigate()
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
          {value.map((itemId, index) => (
            <SelectableItem
              key={`${itemId}|${index}`}
              item={instance.items.find((i) => i.id == itemId) || nothingItem}
              onRightSectionClick={() => {
                onChange(removeOne((e) => e == itemId, value))
              }}
              onClick={() => navigate("items")}
              deleteMode
              hideChance
              user={user}
              attendees={attendees}
            />
          ))}
          {Array.from({
            length: itemLimit ? (itemLimit - value.length) : 1,
          })
            .map((_, i) => (
              <Button
                key={i}
                fullWidth
                h={36}
                onClick={() => navigate("items")}
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
            You can SR at most {itemLimit} item{itemLimit == 1 ? "" : "s"}.
          </Text>
        </Stack>
      </Paper>
      <ItemPicker
        selectedItemIds={value}
        setSelectedItemIds={onChange}
        instance={instance}
        selectedClass={selectedClass || null}
        user={user}
        attendees={attendees}
        selectMode
        hardReserves={hardReserves}
        sameItemLimit={sameItemLimit}
        itemPickerOpen={itemPickerOpen}
      />
    </Stack>
  )
}
