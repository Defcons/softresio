import { useEffect, useState } from "react"
import type { GetInstancesResponse, Instance } from "../shared/types.ts"
import { Paper, Select, Stack } from "@mantine/core"
import { ItemPicker } from "./item-picker.tsx"
import { instanceFilter, instanceOrder, renderInstance } from "./instances.tsx"
import { useNavigate } from "react-router"

export const LootBrowser = (
  { itemPickerOpen = false }: { itemPickerOpen?: boolean },
) => {
  const [instances, setInstances] = useState<Instance[]>([])
  const [instanceId, setInstanceId] = useState<number>()

  const navigate = useNavigate()

  useEffect(() => {
    fetch("/api/instances")
      .then((r) => r.json())
      .then((j: GetInstancesResponse) => {
        if (j.error) {
          alert(j.error.message)
        } else if (j.data) {
          setInstances(
            j.data.sort((a, b) =>
              instanceOrder.indexOf(a.name) - instanceOrder.indexOf(b.name)
            ),
          )
        }
      })
  }, [])

  useEffect(() => {
    if (!itemPickerOpen) {
      setInstanceId(undefined)
    }
  }, [itemPickerOpen])

  const instance = instances.find((instance) => instance.id == instanceId)

  return (
    <Paper shadow="sm" p="sm">
      <Stack gap="md">
        <Select
          withAsterisk={instanceId == undefined}
          searchable
          placeholder="Select instance"
          maxDropdownHeight={1000}
          data={instances?.map((e) => {
            return { value: e.id.toString(), label: e.name }
          })}
          value={instanceId?.toString() || null}
          renderOption={renderInstance(instances)}
          filter={instanceFilter(instances)}
          onChange={(v) => {
            setInstanceId(Number(v))
            if (!itemPickerOpen) navigate("items")
          }}
        />
      </Stack>
      {instance
        ? (
          <ItemPicker
            itemPickerOpen={itemPickerOpen}
            instance={instance}
          />
        )
        : null}
    </Paper>
  )
}
