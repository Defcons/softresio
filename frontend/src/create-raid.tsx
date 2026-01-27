import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import {
  Button,
  Collapse,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
} from "@mantine/core"
import { DateTimePicker } from "@mantine/dates"
import { instanceOrder, renderInstance } from "./instances.tsx"
import { ItemSelect } from "./item-select.tsx"
import type {
  CreateRaidRequest,
  CreateRaidResponse,
  GetInstancesResponse,
  Instance,
} from "../types/types.ts"

export function CreateRaid() {
  const navigate = useNavigate()

  const [instances, setInstances] = useState<Instance[]>()
  const [hrItemIds, setHrItemIds] = useState<number[]>([])

  const [instanceId, setInstanceId] = useState<number>()
  const [description, setDescription] = useState("")
  const [useSrPlus, setUseSrPlus] = useState(false)
  const [useHr, setUseHr] = useState(false)
  const [srCount, setSrCount] = useState<number | undefined>()
  const [time, setTime] = useState<Date>(
    new Date(
      Math.ceil((new Date()).getTime() / (60 * 30 * 1000)) * 60 * 30 * 1000,
    ),
  )

  function createRaid() {
    if (
      instanceId == undefined || srCount == undefined
    ) {
      alert("Missing information")
      return
    }
    const request: CreateRaidRequest = {
      adminPassword: "", // Maybe we completely remove this later
      instanceId,
      useSrPlus,
      description,
      time: time.toISOString(),
      srCount,
      hardReserves: hrItemIds,
    }
    fetch("/api/raid/create", { method: "POST", body: JSON.stringify(request) })
      .then((r) => r.json())
      .then((j: CreateRaidResponse) => {
        if (j.error) {
          alert(j.error)
        } else if (j.data) {
          navigate(`/${j.data.raidId}`)
        }
      })
  }

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
    <>
      <Paper shadow="sm" p="sm">
        <Stack gap="md">
          <Select
            withAsterisk={instanceId == undefined}
            label="Instance"
            searchable
            placeholder="Select instance"
            data={instances?.map((e) => {
              return { value: e.id.toString(), label: e.name }
            })}
            value={(instanceId || "").toString()}
            renderOption={renderInstance(instances || [])}
            onChange={(v) => {
              setInstanceId(Number(v))
              setHrItemIds([])
            }}
          />
          <Textarea
            label="Description"
            value={description}
            autosize
            minRows={3}
            onChange={(event) => setDescription(event.currentTarget.value)}
          />

          <Stack gap={0}>
            <Group mb={3} p={0} gap={3}>
              <Text size="sm">
                Number of SRs
              </Text>
              <Text
                size="sm"
                c="var(--mantine-color-error)"
                hidden={!!srCount}
              >
                *
              </Text>
            </Group>
            <SegmentedControl
              defaultValue=""
              data={["1", "2", "3", "4"]}
              w="100%"
              withItemsBorders={false}
              value={srCount?.toString()}
              onChange={(value: string) => setSrCount(Number(value))}
            />
          </Stack>
          <DateTimePicker
            value={time}
            onChange={(value) => {
              if (value) setTime(new Date(value))
            }}
            label="Pick date and time"
            placeholder="Pick date and time"
          />
          <Switch
            disabled
            value={useSrPlus ? 1 : 0}
            onChange={(event) =>
              setUseSrPlus(event.currentTarget.value ? true : false)}
            label="Use SR+"
          />
          <Switch
            value={useHr ? 1 : 0}
            onChange={(event) =>
              setUseHr(event.currentTarget.value ? true : false)}
            label="Use hard reserves"
          />
          <Collapse in={useHr && !!instanceId}>
            <ItemSelect
              label={"Hard reserves"}
              value={hrItemIds}
              onChange={setHrItemIds}
              items={instances?.find((instance) => instance.id == instanceId)
                ?.items || []}
            />
          </Collapse>
          <Button
            mt="sm"
            onClick={createRaid}
            disabled={!instanceId || !srCount ||
              (useHr && hrItemIds.length == 0)}
          >
            Create Raid
          </Button>
        </Stack>
      </Paper>
    </>
  )
}
