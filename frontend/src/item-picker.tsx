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
import type {
  Attendee,
  Class,
  Instance,
  Item,
  ItemPickerElementType,
  NpcItem,
  User,
} from "../shared/types.ts"
import { useDebounce } from "use-debounce"
import { List } from "react-window"
import { useNavigate } from "react-router"
import { slotOrder } from "./slot-order.ts"
import { deepEqual } from "fast-equals"

import { ItemPickerElement } from "./item.tsx"

export const ItemPicker = ({
  selectedItemIds,
  setSelectedItemIds,
  selectedClass,
  user,
  attendees,
  selectMode,
  hardReserves = [],
  sameItemLimit = 0,
  itemPickerOpen,
  instance,
}: {
  selectedItemIds?: number[]
  setSelectedItemIds?: (itemIds: number[]) => void
  selectedClass?: Class | null
  user?: User
  attendees?: Attendee[]
  selectMode?: boolean
  hardReserves?: number[]
  sameItemLimit?: number
  itemPickerOpen: boolean
  instance: Instance
}) => {
  const [showTooltipElement, setShowTooltipElement] = useState<NpcItem>()
  const [slotFilter, setSlotFilter] = useState<string>()
  const [typeFilter, setTypeFilter] = useState<string>()
  const [bossFilter, setBossFilter] = useState<number>()
  const [search, setSearch] = useState("")
  const [debouncedSearch] = useDebounce(search, 100)
  const [filteredItems, setFilteredItems] = useState(instance.items)
  const navigate = useNavigate()

  const possibleSlots = [
    ...new Set(
      [
        ...filteredItems.flatMap((i) => i.slots),
        ...(filteredItems.find((i) =>
            selectedClass && i.classes.includes(selectedClass)
          ))
          ? ["Class"]
          : [],
      ],
    ),
  ].sort((a, b) => slotOrder.indexOf(a) - slotOrder.indexOf(b))
  const possibleTypes = [
    ...new Set(filteredItems.flatMap((i) => i.types)),
  ]
  const possibleBosses = [
    ...new Set(
      instance.bosses.filter((boss) =>
        filteredItems.find((i) =>
          i.dropsFrom.find((df) => df.bossId == boss.id)
        )
      ).map((boss) => boss.name),
    ),
  ]

  const onElementLongClick = (element: NpcItem) =>
    deepEqual(element, showTooltipElement)
      ? setShowTooltipElement(undefined)
      : setShowTooltipElement(element)

  const onElementClick = (element: NpcItem, rightSection: boolean) => {
    if (!setSelectedItemIds || !selectedItemIds) {
      return setShowTooltipElement(undefined)
    }
    if (
      (!hardReserves.includes(element.itemId)) &&
      (!showTooltipElement || deepEqual(element, showTooltipElement))
    ) {
      const contextualItemLimit = rightSection ? 1 : sameItemLimit
      if (
        selectedItemIds.filter((i) => i == element.itemId).length <
          contextualItemLimit
      ) {
        setSelectedItemIds([...selectedItemIds, element.itemId])
      } else {
        setSelectedItemIds(selectedItemIds.filter((i) => i !== element.itemId))
      }
    }
    setShowTooltipElement(undefined)
  }

  useEffect(() => {
    setFilteredItems(
      instance.items.filter((item) =>
        (item.name.toLowerCase().includes(
          debouncedSearch.toLowerCase() || "",
        )) &&
        (slotFilter == undefined ||
          (slotFilter == "Class" && selectedClass &&
            item.classes.includes(selectedClass)) ||
          item.slots.includes(slotFilter)) &&
        (bossFilter == undefined ||
          item.dropsFrom.find((df) => df.bossId == bossFilter)) &&
        (typeFilter == undefined || item.types.includes(typeFilter))
      ),
    )
  }, [
    instance,
    bossFilter,
    debouncedSearch,
    slotFilter,
    typeFilter,
    selectedClass,
  ])

  const sortItem = (a: Item, b: Item) => {
    if (a.quality == b.quality) {
      return b.dropsFrom[0].chance - a.dropsFrom[0].chance
    } else {
      return b.quality - a.quality
    }
  }

  const makeListElements = () => {
    let elements: ItemPickerElementType[] = []
    if (bossFilter) {
      // NPC segments if boss selected
      for (
        const npc of instance.npcs.filter((npc) => npc.bossId == bossFilter)
      ) {
        const items = filteredItems.map((i) => ({
          npcId: npc.id,
          item: {
            ...i,
            dropsFrom: i.dropsFrom.filter((df) => df.npcId == npc.id),
          },
        })).filter((i) => i.item.dropsFrom.length > 0).sort((a, b) =>
          sortItem(a.item, b.item)
        )
        if (items.length > 0) {
          elements = [...elements, { segment: npc.name }, ...items]
        }
      }
    } else {
      // Boss segments otherwise
      for (const boss of instance.bosses) {
        const items = instance.npcs.filter((npc) => npc.bossId == boss.id)
          .flatMap((npc) =>
            filteredItems.map((i) => ({
              npcId: npc.id,
              item: {
                ...i,
                dropsFrom: i.dropsFrom.filter((df) => df.npcId == npc.id),
              },
            })).filter((i) => i.item.dropsFrom.length > 0).sort((a, b) =>
              sortItem(a.item, b.item)
            )
          )
        if (items.length > 0) {
          elements = [...elements, { segment: boss.name }, ...items]
        }
      }
    }
    return elements
  }

  const listElements = makeListElements()

  return (
    <Modal
      opened={itemPickerOpen}
      onClose={() => {
        setShowTooltipElement(undefined)
        setSearch("")
        setSlotFilter(undefined)
        setTypeFilter(undefined)
        setBossFilter(undefined)
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
            onFocus={() => setShowTooltipElement(undefined)}
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
              setShowTooltipElement(undefined)
              navigate(-1)
            }}
          />
        </Group>
        <Select
          placeholder="Boss"
          disabled={possibleBosses.length == 0}
          onFocus={() => setShowTooltipElement(undefined)}
          searchable
          clearable
          value={instance.bosses.find((boss) => boss.id == bossFilter)?.name ||
            null}
          onChange={(value) => {
            const boss = instance.bosses.find((b) => b.name == value)
            if (boss) setBossFilter(boss.id)
            else setBossFilter(undefined)
            console.log(boss)
          }}
          data={possibleBosses}
        />
        <Group grow>
          <Select
            placeholder="Slot"
            searchable
            clearable
            disabled={possibleSlots.length == 0}
            onFocus={() => setShowTooltipElement(undefined)}
            value={slotFilter || null}
            onChange={(value) => {
              setSlotFilter(value || undefined)
            }}
            data={possibleSlots}
          />
          <Select
            placeholder="Type"
            disabled={possibleTypes.length == 0}
            onFocus={() => setShowTooltipElement(undefined)}
            searchable
            clearable
            value={typeFilter || null}
            onChange={(value) => setTypeFilter(value || undefined)}
            data={possibleTypes}
          />
        </Group>
        <List
          rowComponent={ItemPickerElement}
          rowCount={listElements.length}
          rowHeight={41}
          style={{ flexGrow: 0 }}
          rowProps={{
            attendees: attendees,
            elements: listElements,
            onClick: (element: NpcItem) => onElementClick(element, false),
            onRightSectionClick: (element: NpcItem) =>
              onElementClick(element, true),
            selectedItemIds,
            showTooltipElement,
            onLongClick: onElementLongClick,
            user,
            selectMode,
            hardReserves,
            sameItemLimit,
          }}
        />
        <Box onClick={() => setShowTooltipElement(undefined)} flex={1}>
        </Box>
      </Flex>
    </Modal>
  )
}
