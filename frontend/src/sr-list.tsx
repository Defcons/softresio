import { useState } from "react"
import {
  ActionIcon,
  Group,
  Menu,
  Select,
  Table,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core"
import { useHover } from "@mantine/hooks"
import type {
  Attendee,
  Class,
  Item,
  SoftReserve,
  User,
} from "../types/types.ts"
import { ItemNameAndIcon } from "./item.tsx"
import { ClassIcon } from "./class.tsx"
import {
  IconArrowsSort,
  IconSortAscendingLetters,
  IconSortDescendingLetters,
  IconX,
} from "@tabler/icons-react"
import { classes, renderClass } from "./class.tsx"
import { nothingItem } from "./mock-item.ts"
import { IconShieldFilled, IconTrash } from "@tabler/icons-react"

type ListElement = { attendee: Attendee; softReserve: SoftReserve }

export const SrListElement = (
  { visible, item, attendee, admins, user }: {
    visible: boolean
    item: Item
    attendee: Attendee
    admins: User[]
    user: User
  },
) => {
  const { ref, hovered } = useHover()
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <Menu
      opened={menuOpen}
      onChange={setMenuOpen}
      position="bottom-start"
    >
      <Menu.Target>
        <Table.Tr
          ref={ref}
          className={hovered || menuOpen
            ? "list-element-hover"
            : "list-element"}
          style={{ visibility: visible ? "visible" : "hidden" }}
        >
          <Table.Td>
            <Tooltip
              label={`${attendee.character.spec} ${attendee.character.class}`}
            >
              <Group gap={2} wrap="nowrap">
                <ClassIcon xclass={attendee.character.class} />
                <ClassIcon
                  xclass={attendee.character.class}
                  spec={attendee.character.spec}
                />
              </Group>
            </Tooltip>
          </Table.Td>
          <Table.Td>
            <Group gap={4}>
              <Title order={6} lineClamp={1}>
                {attendee.character.name}
              </Title>
              {admins.find((a) => a.userId == attendee.user.userId)
                ? <IconShieldFilled size={16} />
                : null}
            </Group>
          </Table.Td>
          <Table.Td>
            <ItemNameAndIcon
              item={item}
              highlight={false}
              allowImageClick={false}
            />
          </Table.Td>
        </Table.Tr>
      </Menu.Target>
      <Menu.Dropdown>
        {!admins.find((a) => a.userId == attendee.user.userId) &&
            admins.find((a) => a.userId == user.userId)
          ? (
            <Menu.Item
              leftSection={<IconShieldFilled size={14} />}
            >
              Promote to Admin
            </Menu.Item>
          )
          : null}
        <Menu.Item
          disabled={!!admins.find((a) => a.userId == user.userId) ||
            attendee.user.userId == user.userId}
          color="red"
          leftSection={<IconTrash size={14} />}
        >
          Delete SR
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}

export const SrList = (
  { attendees, items, admins, user }: {
    attendees: Attendee[]
    items: Item[]
    admins: User[]
    user: User
  },
) => {
  const [classFilter, setClassFilter] = useState<Class>()
  const [nameFilter, setNameFilter] = useState<string>()
  const [itemFilter, setItemFilter] = useState<string>()
  const [sortBy, setSortBy] = useState<"name" | "item" | "class">()
  const [sortDesc, setSortDesc] = useState<boolean>(false)

  const filter = (
    { attendee, softReserve }: ListElement,
  ) => ((!classFilter || attendee.character.class == classFilter) &&
    (!nameFilter || attendee.character.name.startsWith(nameFilter)) &&
    (!itemFilter ||
      (items.find((item) => item.id == softReserve.itemId) || nothingItem).name
        .toLowerCase()
        .includes(itemFilter.toLowerCase())))

  const sort = (a: ListElement, b: ListElement) => {
    let valueA = ""
    let valueB = ""
    if (sortBy == "name") {
      valueA = a.attendee.character.name
      valueB = b.attendee.character.name
    } else if (sortBy == "item") {
      valueA = (items.find((item) =>
        item.id == a.softReserve.itemId
      ) || nothingItem).name
      valueB = (items.find((item) =>
        item.id == b.softReserve.itemId
      ) || nothingItem).name
    } else {
      // defaults to sort by "class"
      valueA = a.attendee.character.class
      valueB = b.attendee.character.class
    }
    return valueA.localeCompare(valueB) * (sortDesc ? -1 : 1)
  }

  const elements = attendees.flatMap((attendee) =>
    attendee.softReserves.map((softReserve, index) => ({
      softReserve,
      attendee,
      index,
    }))
  ).sort(sort).sort((a, b) => (Number(filter(a)) * -1 + Number(filter(b))))

  return (
    <Table
      horizontalSpacing={5}
      verticalSpacing={0}
      striped
      withRowBorders={false}
    >
      <Table.Thead>
        <Table.Tr>
          <Table.Th maw={35}>
            <Select
              pb="sm"
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
                pb="sm"
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
                      setSortBy(undefined)
                      setSortDesc(false)
                    }}
                  />
                }
              />
            </Group>
          </Table.Th>
          <Table.Th>
            <Group wrap="nowrap" gap={3}>
              <TextInput
                pb="sm"
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
                      setSortBy(undefined)
                      setSortDesc(false)
                    }}
                  />
                }
              />
              <ActionIcon
                mb="sm"
                variant={classFilter || nameFilter || itemFilter || sortDesc ||
                    sortBy
                  ? ""
                  : "subtle"}
                color={classFilter || nameFilter || itemFilter || sortDesc ||
                    sortBy
                  ? ""
                  : "lightgrey"}
                onClick={() => {
                  setClassFilter(undefined)
                  setNameFilter(undefined)
                  setItemFilter(undefined)
                  setSortBy(undefined)
                  setSortDesc(false)
                }}
              >
                <IconX />
              </ActionIcon>
            </Group>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {elements.map((e) => (
          <SrListElement
            key={e.attendee.character.name + e.softReserve.itemId + e.index}
            visible={filter(e)}
            attendee={e.attendee}
            item={items.find((i) => i.id == e.softReserve.itemId) ||
              nothingItem}
            user={user}
            admins={admins}
          />
        ))}
      </Table.Tbody>
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
