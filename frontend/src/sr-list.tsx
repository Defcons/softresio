import { useState } from "react"
import {
  ActionIcon,
  Group,
  Select,
  Table,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core"
import type { Attendee, Class, Item, SoftReserve } from "../types/types.ts"
import { ItemNameAndIcon } from "./item.tsx"
import { ClassIcon } from "./class.tsx"
import {
  IconArrowsSort,
  IconSortAscendingLetters,
  IconSortDescendingLetters,
  IconX,
} from "@tabler/icons-react"
import { classes, renderClass } from "./class.tsx"

type ListElement = { attendee: Attendee; softReserve: SoftReserve }

export const SrList = (
  { attendees, items }: { attendees: Attendee[]; items: Item[] },
) => {
  const [classFilter, setClassFilter] = useState<Class>()
  const [nameFilter, setNameFilter] = useState<string>()
  const [itemFilter, setItemFilter] = useState<string>()
  const [sortBy, setSortBy] = useState<"name" | "item" | "class">("class")
  const [sortDesc, setSortDesc] = useState<boolean>(false)

  const filter = (
    { attendee, softReserve }: ListElement,
  ) => ((!classFilter || attendee.character.class == classFilter) &&
    (!nameFilter || attendee.character.name.startsWith(nameFilter)) &&
    (!itemFilter ||
      items.filter((item) => item.id == softReserve.itemId)[0]?.name
        .toLowerCase()
        .includes(itemFilter.toLowerCase())))

  const sort = (a: ListElement, b: ListElement) => {
    let valueA = ""
    let valueB = ""
    if (sortBy == "name") {
      valueA = a.attendee.character.name
      valueB = b.attendee.character.name
    } else if (sortBy == "class") {
      valueA = a.attendee.character.class
      valueB = b.attendee.character.class
    } else if (sortBy == "item") {
      valueA = items.filter((item) => item.id == a.softReserve.itemId)[0]?.name
      valueB = items.filter((item) => item.id == b.softReserve.itemId)[0]?.name
    }
    return valueA.localeCompare(valueB) * (sortDesc ? -1 : 1)
  }

  const elements = attendees.flatMap((attendee) =>
    attendee.softReserves.map((softReserve) => ({ softReserve, attendee }))
  ).sort(sort).sort((a, b) => (Number(filter(a)) * -1 + Number(filter(b))))

  const rows = elements.map((e) => (
    <Table.Tr
      key={e.attendee.character.name + e.softReserve.itemId}
      style={{ visibility: filter(e) ? "visible" : "hidden" }}
    >
      <Table.Td>
        <Tooltip
          label={`${e.attendee.character.spec} ${e.attendee.character.class}`}
        >
          <Group gap={2} wrap="nowrap">
            <ClassIcon xclass={e.attendee.character.class} />
            <ClassIcon
              xclass={e.attendee.character.class}
              spec={e.attendee.character.spec}
            />
          </Group>
        </Tooltip>
      </Table.Td>
      <Table.Td>
        <Title order={6} lineClamp={1}>
          {e.attendee.character.name}
        </Title>
      </Table.Td>
      <Table.Td>
        <ItemNameAndIcon
          item={items.filter((item) => item.id == e.softReserve.itemId)[0]}
          highlight={false}
          onClick={() =>
            setItemFilter(
              items.filter((item) => item.id == e.softReserve.itemId)[0].name,
            )}
          onLongClick={() => null}
        />
      </Table.Td>
    </Table.Tr>
  ))
  return (
    <Table horizontalSpacing={3}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={40}>
            <Select
              data={Object.keys(classes)}
              onChange={(value) => setClassFilter(value as Class || undefined)}
              value={classFilter}
              rightSection={classFilter
                ? <ClassIcon xclass={classFilter} />
                : undefined}
              rightSectionPointerEvents="none"
              renderOption={renderClass(classFilter)}
              comboboxProps={{ width: 140, position: "bottom-start" }}
            />
          </Table.Th>
          <Table.Th w={120}>
            <Group wrap="nowrap" gap={0}>
              <TextInput
                placeholder="Name"
                onChange={(event) =>
                  setNameFilter(event.currentTarget.value || undefined)}
                value={nameFilter || ""}
                rightSection={
                  <SortButton
                    active={sortBy == "name"}
                    activate={() => setSortBy("name")}
                    asc={!sortDesc}
                    sortDesc={() => setSortDesc(true)}
                    reset={() => {
                      setSortBy("class")
                      setSortDesc(false)
                    }}
                  />
                }
              />
            </Group>
          </Table.Th>
          <Table.Th>
            <Group wrap="nowrap" gap={0}>
              <TextInput
                placeholder="Item"
                onChange={(event) =>
                  setItemFilter(event.currentTarget.value || undefined)}
                value={itemFilter || ""}
                w="100%"
                rightSection={
                  <SortButton
                    active={sortBy == "item"}
                    activate={() => setSortBy("item")}
                    asc={!sortDesc}
                    sortDesc={() => setSortDesc(true)}
                    reset={() => {
                      setSortBy("class")
                      setSortDesc(false)
                    }}
                  />
                }
              />
              <ActionIcon
                variant="subtle"
                color="lightgrey"
                onClick={() => {
                  setClassFilter()
                  setNameFilter()
                  setItemFilter()
                }}
              >
                <IconX />
              </ActionIcon>
            </Group>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  )
}

export const SortButton = (
  { active, activate, sortDesc, reset, asc }: {
    active: boolean
    activate: () => void
    reset: () => void
    sortDesc: () => void
    asc: boolean
  },
) => (
  <ActionIcon
    color={active ? "" : "lightgray"}
    variant={active ? "" : "subtle"}
    onClick={() => {
      if (!active) {
        activate()
      } else if (!asc) {
        reset()
      } else {
        sortDesc()
      }
    }}
  >
    {active
      ? asc ? <IconSortAscendingLetters /> : <IconSortDescendingLetters />
      : <IconArrowsSort />}
  </ActionIcon>
)
