import { useEffect, useState } from "react"
import type { GetInstancesResponse, Instance } from "../types/types.ts"
import { Button, Paper, Select, Stack, Title } from "@mantine/core"
import { ItemPicker } from "./item-picker.tsx"

export const LootBrowser = () => {
  const [instances, setInstances] = useState<Instance[]>([])
  const [instanceId, setInstanceId] = useState<number>()

  const [itemBrowserOpen, setItemBrowserOpen] = useState<boolean>(false)

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

  return (
    <Paper shadow="sm" p="sm">
      <Stack gap="md">
        <Title order={3}>Loot browser</Title>
        <Select
          withAsterisk={instanceId == undefined}
          searchable
          placeholder="Select instance"
          data={instances?.map((e) => {
            return { value: e.id.toString(), label: e.name }
          })}
          value={(instanceId || "").toString()}
          onChange={(v) => setInstanceId(Number(v))}
        />
        <Button onClick={() => setItemBrowserOpen(true)} disabled={!instanceId}>
          Browse
        </Button>
      </Stack>
      <ItemPicker
        items={instances.filter((instance) => instance.id == instanceId)[0]
          ?.items || []}
        open={itemBrowserOpen}
        setOpen={setItemBrowserOpen}
      />
    </Paper>
  )
}
