import { useEffect, useState } from "react"
import type { GetInstancesResponse, Instance } from "../types/types.ts"
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
          alert(j.error)
        } else if (j.data) {
          setInstances(
            j.data.sort((a, b) =>
              instanceOrder.indexOf(a.name) - instanceOrder.indexOf(b.name)
            ),
          )
        }
      })
  }, [])

  return (
    <Paper shadow="sm" p="sm">
      <Stack gap="md">
        <Select
          withAsterisk={instanceId == undefined}
          searchable
          placeholder="Select instance"
          data={instances?.map((e) => {
            return { value: e.id.toString(), label: e.name }
          })}
          value={(instanceId || "").toString()}
          renderOption={renderInstance(instances)}
          filter={instanceFilter(instances)}
          onChange={(v) => {
            setInstanceId(Number(v))
            navigate("items")
          }}
        />
      </Stack>
      <ItemPicker
        items={instances.filter((instance) => instance.id == instanceId)[0]
          ?.items || []}
        itemPickerOpen={itemPickerOpen}
      />
    </Paper>
  )
}
