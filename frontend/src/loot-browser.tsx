import { useEffect, useState } from "react"
import type { GetInstancesResponse, Instance, Item } from "../types/types.ts"
import { Group, Input, Paper, Select, Stack, Title } from "@mantine/core"
import { IconSearch } from "@tabler/icons-react"
import { itemFilters } from "./item-filters.ts"
import { ItemNameAndIcon } from "./item.tsx"
import { List } from "react-window"
import { useDebounce } from "use-debounce"
import { type RowComponentProps } from "react-window"

const ItemNameAndIconByIndex = ({
  index,
  items,
}: RowComponentProps<{
  items: Item[]
}>) => {
  return (
    <ItemNameAndIcon
      item={items[index]}
      highlight={false}
      onClick={() => null}
      onLongClick={() => null}
    />
  )
}

export const LootBrowser = () => {
  const [instances, setInstances] = useState<Instance[]>([])
  const [instanceId, setInstanceId] = useState<number>()

  const [slotFilter, setSlotFilter] = useState<string | null>()
  const [typeFilter, setTypeFilter] = useState<string | null>()
  const [search, setSearch] = useState("")
  const [debouncedSearch] = useDebounce(search, 100)
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState(items)

  const selectedClass = null

  useEffect(() => {
    fetch("/api/instances")
      .then((r) => r.json())
      .then((j: GetInstancesResponse) => {
        if (j.error) {
          alert(j.error)
        } else if (j.data) {
          setInstances(j.data)
        }
      })
  }, [])

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
  }, [debouncedSearch, slotFilter, typeFilter, selectedClass, items])

  return (
    <>
      <Paper shadow="sm" p="sm">
        <Stack gap="md">
          <Title order={2}>Loot browser</Title>
          <Select
            withAsterisk={instanceId == undefined}
            searchable
            placeholder="Select instance"
            data={instances?.map((e) => {
              return { value: e.id.toString(), label: e.name }
            })}
            value={(instanceId || "").toString()}
            onChange={(v) => {
              const instanceId = Number(v)
              setInstanceId(instanceId)
              setItems(
                instances.filter((instance) => instance.id == instanceId)[0]
                  .items,
              )
            }}
          />
        </Stack>
      </Paper>
      {instanceId != undefined
        ? (
          <Paper shadow="sm" p="sm">
            <Stack h="100%" gap="md">
              <Group justify="space-between" wrap="nowrap">
                <Input
                  w="100%"
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                  leftSection={<IconSearch size={16} />}
                  rightSectionPointerEvents="auto"
                  placeholder="Search.."
                />
              </Group>
              <Group grow>
                <Select
                  placeholder="Slot"
                  searchable
                  clearable
                  value={slotFilter}
                  onChange={(value) => {
                    setSlotFilter(value)
                    if (
                      value && typeFilter &&
                      !itemFilters[value].includes(value)
                    ) setTypeFilter(null)
                  }}
                  data={Object.keys(itemFilters)}
                />
                <Select
                  placeholder="Type"
                  disabled={!slotFilter || itemFilters[slotFilter].length == 0}
                  searchable
                  clearable
                  value={typeFilter}
                  onChange={(value) => setTypeFilter(value || undefined)}
                  data={slotFilter ? itemFilters[slotFilter] : []}
                />
              </Group>
              <List
                rowComponent={ItemNameAndIconByIndex}
                rowCount={filteredItems.length}
                rowHeight={40}
                rowProps={{
                  items: filteredItems,
                }}
              />
            </Stack>
          </Paper>
        )
        : null}
    </>
  )
}
