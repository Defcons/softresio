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
import { instanceFilter, instanceOrder, renderInstance } from "./instances.tsx"
import { ItemSelect } from "./item-select.tsx"
import type {
  CreateRaidRequest,
  CreateRaidResponse,
  GetInstancesResponse,
  Instance,
} from "../shared/types.ts"

export const CreateRaid = (
  { itemPickerOpen = false }: { itemPickerOpen?: boolean },
) => {
  const navigate = useNavigate()

  const [instances, setInstances] = useState<Instance[]>()
  const [instance, setInstance] = useState<Instance>()
  const [hrItemIds, setHrItemIds] = useState<number[]>([])

  const [description, setDescription] = useState("")
  const [useSrPlus, setUseSrPlus] = useState(false)
  const [allowDuplicateSr, setAllowDuplicateSr] = useState(false)
  const [useHr, setUseHr] = useState(false)
  const [srCount, setSrCount] = useState<number | undefined>()
  const [time, setTime] = useState<Date>(
    new Date(
      Math.ceil((new Date()).getTime() / (60 * 30 * 1000)) * 60 * 30 * 1000,
    ),
  )

  function createRaid() {
    if (
      instance == undefined || srCount == undefined
    ) {
      alert("Missing information")
      return
    }
    const request: CreateRaidRequest = {
      adminPassword: "", // Maybe we completely remove this later
      instanceId: instance.id,
      useSrPlus,
      description,
      time: time.toISOString(),
      srCount,
      hardReserves: hrItemIds,
      allowDuplicateSr,
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
            withAsterisk={instance == undefined}
            label="Instance"
            searchable
            placeholder="Select instance"
            maxDropdownHeight={1000}
            data={instances?.map((e) => {
              return { value: e.id.toString(), label: e.name }
            })}
            value={instance?.id.toString() || null}
            renderOption={renderInstance(instances || [])}
            filter={instanceFilter(instances || [])}
            onChange={(v) => {
              setInstance(instances?.find((i) => i.id == Number(v)))
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
          <Collapse in={(srCount || 0) > 1}>
            <Switch
              value={allowDuplicateSr ? 1 : 0}
              onChange={(event) =>
                setAllowDuplicateSr(event.currentTarget.checked)}
              label="Allow duplicate SRs"
            />
          </Collapse>
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
            onChange={(event) => setUseSrPlus(event.currentTarget.checked)}
            label="Use SR+"
          />
          <Switch
            value={useHr ? 1 : 0}
            onChange={(event) => {
              setUseHr(event.target.checked)
              if (!event.target.checked) setHrItemIds([])
            }}
            label="Use hard reserves"
          />
          <Collapse in={useHr && instance ? true : false}>
            {instance
              ? (
                <ItemSelect
                  label={"Select the item's you want to hard-reserve"}
                  value={hrItemIds}
                  onChange={setHrItemIds}
                  sameItemLimit={1}
                  instance={instance}
                  itemPickerOpen={itemPickerOpen}
                />
              )
              : null}
          </Collapse>
          <Button
            mt="sm"
            onClick={createRaid}
            disabled={!instance || !srCount ||
              (useHr && hrItemIds.length == 0)}
          >
            Create Raid
          </Button>
        </Stack>
      </Paper>
    </>
  )
}
