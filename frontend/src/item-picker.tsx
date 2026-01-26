import { useEffect, useState } from "react"
import { CloseButton, Group, Input, Modal, Select, Stack } from "@mantine/core"
import { IconSearch } from "@tabler/icons-react"
import { itemFilters } from "./item-filters.ts"
import type { Attendee, Class, Item, User } from "../types/types.ts"
import { useDebounce } from "use-debounce"
import { List } from "react-window"

import { ReactWindowSelectableItem } from "./item.tsx"

export const ItemPicker = ({
  selectedItemIds,
  setSelectedItemIds,
  items,
  open,
  setOpen,
  selectedClass,
  user,
  attendees,
  selectMode,
}: {
  selectedItemIds?: number[]
  setSelectedItemIds?: (itemIds: number[]) => void
  items: Item[]
  open: boolean
  setOpen: (open: boolean) => void
  selectedClass?: Class | null
  user?: User
  attendees?: Attendee[]
  selectMode?: boolean
}) => {
  const [showTooltipItemId, setShowTooltipItemId] = useState<number>()
  const [slotFilter, setSlotFilter] = useState<string | null>()
  const [typeFilter, setTypeFilter] = useState<string | null>()
  const [search, setSearch] = useState("")
  const [debouncedSearch] = useDebounce(search, 100)
  const [filteredItems, setFilteredItems] = useState(items)

  const onItemLongClick = (itemId: number) =>
    showTooltipItemId === itemId
      ? setShowTooltipItemId(undefined)
      : setShowTooltipItemId(itemId)

  const onItemClick = (itemId: number) => {
    if (!setSelectedItemIds || !selectedItemIds) {
      return setShowTooltipItemId(undefined)
    }
    if (!showTooltipItemId || showTooltipItemId == itemId) {
      if (selectedItemIds.includes(itemId)) {
        setSelectedItemIds(selectedItemIds.filter((i) => i !== itemId))
      } else {
        setSelectedItemIds([...selectedItemIds, itemId])
      }
    }
    setShowTooltipItemId(undefined)
  }

  useEffect(() => {
    // Clear filter in item browser if new raid doesnt have that category
    if (!items.some((i) => i.slot == slotFilter)) {
      setSlotFilter(null)
    }
    if (!items.some((i) => i.slot == slotFilter && i.type == typeFilter)) {
      setTypeFilter(null)
    }
  }, [slotFilter, typeFilter, items])

  useEffect(() => {
    setFilteredItems(
      items.filter((item) => {
        const stringQuery = debouncedSearch?.toLowerCase() || ""
        if (
          !item.name.toLowerCase().includes(stringQuery)
        ) {
          return false
        } else if (
          slotFilter == "Class" && selectedClass &&
          !item.classes.includes(selectedClass)
        ) {
          console.log(item.name)
          return false
        } else if (
          slotFilter && slotFilter != "Class" && item.slot != slotFilter
        ) {
          return false
        } else if (
          typeFilter && item.type != typeFilter
        ) {
          return false
        } else {
          return true
        }
      }),
    )
  }, [items, debouncedSearch, slotFilter, typeFilter, selectedClass])

  return (
    <Modal
      opened={open}
      onClose={() => {
        setShowTooltipItemId(undefined)
        setOpen(false)
      }}
      withCloseButton={false}
      styles={{
        body: { height: "90dvh" },
      }}
      padding="sm"
    >
      <Stack h="100%">
        <Group justify="space-between" wrap="nowrap">
          <Input
            w="100%"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            onFocus={() => setShowTooltipItemId(undefined)}
            leftSection={<IconSearch size={16} />}
            rightSection={
              <CloseButton
                onClick={() => setSearch("")}
                size="sm"
                style={{ display: search ? undefined : "none" }}
              />
            }
            rightSectionPointerEvents="auto"
            placeholder="Search.."
          />
          <CloseButton
            onClick={() => {
              setShowTooltipItemId(undefined)
              setOpen(false)
            }}
          />
        </Group>
        <Group grow>
          <Select
            placeholder="Slot"
            searchable
            clearable
            onFocus={() => setShowTooltipItemId(undefined)}
            value={slotFilter}
            onChange={(value) => {
              setSlotFilter(value)
              if (
                value && typeFilter &&
                !itemFilters[value].some((typeOption) =>
                  items.some((i) =>
                    i.slot == slotFilter && i.type == typeOption
                  )
                )
              ) setTypeFilter(null)
            }}
            data={Object.keys(itemFilters).filter((slotOption) =>
              items.some((i) => i.slot == slotOption)
            )}
          />
          <Select
            placeholder="Type"
            disabled={!slotFilter || itemFilters[slotFilter].length == 0}
            onFocus={() => setShowTooltipItemId(undefined)}
            searchable
            clearable
            value={typeFilter}
            onChange={(value) => setTypeFilter(value || undefined)}
            data={slotFilter
              ? itemFilters[slotFilter].filter((typeOption) =>
                items.some((i) => i.slot == slotFilter && i.type == typeOption)
              )
              : []}
          />
        </Group>
        <List
          rowComponent={ReactWindowSelectableItem}
          rowCount={filteredItems.length}
          rowHeight={41}
          rowProps={{
            items: filteredItems,
            attendees: attendees,
            onItemClick,
            selectedItemIds,
            showTooltipItemId,
            onItemLongClick,
            user,
            selectMode,
          }}
        />
      </Stack>
    </Modal>
  )
}
