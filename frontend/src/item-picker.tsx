import { useEffect, useState } from "react"
import {
  Box,
  CloseButton,
  Flex,
  Group,
  Input,
  Modal,
  Select,
} from "@mantine/core"
import { IconSearch } from "@tabler/icons-react"
import type { Attendee, Class, Item, User } from "../shared/types.ts"
import { useDebounce } from "use-debounce"
import { List } from "react-window"
import { useNavigate } from "react-router"

import { ReactWindowSelectableItem } from "./item.tsx"

export const ItemPicker = ({
  selectedItemIds,
  setSelectedItemIds,
  items,
  selectedClass,
  user,
  attendees,
  selectMode,
  hardReserves = [],
  sameItemLimit = 0,
  itemPickerOpen,
}: {
  selectedItemIds?: number[]
  setSelectedItemIds?: (itemIds: number[]) => void
  items: Item[]
  selectedClass?: Class | null
  user?: User
  attendees?: Attendee[]
  selectMode?: boolean
  hardReserves?: number[]
  sameItemLimit?: number
  itemPickerOpen: boolean
}) => {
  const [showTooltipItemId, setShowTooltipItemId] = useState<number>()
  const [slotFilter, setSlotFilter] = useState<string>()
  const [typeFilter, setTypeFilter] = useState<string>()
  const [search, setSearch] = useState("")
  const [debouncedSearch] = useDebounce(search, 100)
  const [filteredItems, setFilteredItems] = useState(items)
  const navigate = useNavigate()

  const slotsForType = (
    type?: string,
  ) => [
    ...new Set(
      items.filter((i) => type ? i.types.includes(type) : true).flatMap((i) =>
        i.slots
      ),
    ),
  ]
  const typesForSlot = (
    slot?: string,
  ) => [
    ...new Set(
      items.filter((i) => slot ? i.slots.includes(slot) : true).flatMap((i) =>
        i.types
      ),
    ),
  ]

  const onItemLongClick = (itemId: number) =>
    showTooltipItemId === itemId
      ? setShowTooltipItemId(undefined)
      : setShowTooltipItemId(itemId)

  const onItemClick = (itemId: number, rightSection: boolean) => {
    if (!setSelectedItemIds || !selectedItemIds) {
      return setShowTooltipItemId(undefined)
    }
    if (
      (!hardReserves.includes(itemId)) &&
      (!showTooltipItemId || showTooltipItemId == itemId)
    ) {
      const contextualItemLimit = rightSection ? 1 : sameItemLimit
      if (
        selectedItemIds.filter((i) => i == itemId).length < contextualItemLimit
      ) {
        setSelectedItemIds([...selectedItemIds, itemId])
      } else {
        setSelectedItemIds(selectedItemIds.filter((i) => i !== itemId))
      }
    }
    setShowTooltipItemId(undefined)
  }

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
          slotFilter && slotFilter != "Class" &&
          !item.slots.includes(slotFilter)
        ) {
          return false
        } else if (
          typeFilter && !item.types.includes(typeFilter)
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
      opened={itemPickerOpen}
      onClose={() => {
        setShowTooltipItemId(undefined)
        navigate(-1)
      }}
      withCloseButton={false}
      styles={{
        body: { height: "90dvh" },
      }}
      padding="sm"
    >
      <Flex h="100%" direction="column" gap="sm">
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
              navigate(-1)
            }}
          />
        </Group>
        <Group grow>
          <Select
            placeholder="Slot"
            searchable
            clearable
            disabled={slotsForType(typeFilter).length == 0}
            onFocus={() => setShowTooltipItemId(undefined)}
            value={slotFilter || null}
            onChange={(value) => {
              setSlotFilter(value || undefined)
            }}
            data={slotsForType(typeFilter)}
          />
          <Select
            placeholder="Type"
            disabled={typesForSlot(slotFilter).length == 0}
            onFocus={() => setShowTooltipItemId(undefined)}
            searchable
            clearable
            value={typeFilter || null}
            onChange={(value) => setTypeFilter(value || undefined)}
            data={typesForSlot(slotFilter)}
          />
        </Group>
        <List
          rowComponent={ReactWindowSelectableItem}
          rowCount={filteredItems.length}
          rowHeight={41}
          style={{ flexGrow: 0 }}
          rowProps={{
            items: filteredItems,
            attendees: attendees,
            onClick: (itemId) => onItemClick(itemId, false),
            onRightSectionClick: (itemId) => onItemClick(itemId, true),
            selectedItemIds,
            showTooltipItemId,
            onLongClick: onItemLongClick,
            user,
            selectMode,
            hardReserves,
            sameItemLimit,
          }}
        />
        <Box onClick={() => setShowTooltipItemId(undefined)} flex={1}>
        </Box>
      </Flex>
    </Modal>
  )
}
