import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
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
import { modals } from "@mantine/modals"
import { instanceFilter, instanceOrder, renderInstance } from "./instances.tsx"
import { ItemSelect } from "./item-select.tsx"
import type {
  CreateEditRaidRequest,
  CreateEditRaidResponse,
  GetInstancesResponse,
  GetRaidResponse,
  Instance,
  Raid,
} from "../shared/types.ts"
import { deepEqual } from "fast-equals"

export const CreateRaid = (
  { itemPickerOpen = false, edit = false }: {
    itemPickerOpen?: boolean
    edit?: boolean
  },
) => {
  const navigate = useNavigate()
  const params = useParams()

  const [raidBeforeEdit, setRaidBeforeEdit] = useState<Raid>()
  const [instances, setInstances] = useState<Instance[]>()
  const [instance, setInstance] = useState<Instance>()
  const [hardReserves, setHardReserves] = useState<number[]>([])

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

  const createRaid = () => {
    if (
      instance == undefined || srCount == undefined
    ) {
      alert("Missing information")
      return
    }
    const request: CreateEditRaidRequest = {
      raidId: edit ? params.raidId : undefined,
      adminPassword: "", // Maybe we completely remove this later
      instanceId: instance.id,
      useSrPlus,
      description,
      time: time.toISOString(),
      srCount,
      hardReserves,
      allowDuplicateSr,
    }
    fetch("/api/raid/create", { method: "POST", body: JSON.stringify(request) })
      .then((r) => r.json())
      .then((j: CreateEditRaidResponse) => {
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

  useEffect(() => {
    if (params.raidId && instances) {
      fetch(`/api/raid/${params.raidId}`).then((r) => r.json()).then(
        (j: GetRaidResponse) => {
          if (j.error) {
            alert(j.error)
          } else if (j.data) {
            const raid = j.data
            setInstance(instances.find((i) => i.id == raid.instanceId))
            setHardReserves(raid.hardReserves)
            setDescription(raid.description)
            setUseSrPlus(raid.useSrPlus)
            setAllowDuplicateSr(raid.allowDuplicateSr)
            setUseHr(raid.hardReserves.length > 0)
            setSrCount(raid.srCount)

            if (edit) {
              setTime(new Date(raid.time))
              setRaidBeforeEdit(raid)
            }
          }
        },
      )
    }
  }, [instances])

  const raidChanged = () => {
    if (!raidBeforeEdit) return true
    const a = {
      instanceId: raidBeforeEdit.instanceId,
      hardReserves: raidBeforeEdit.hardReserves.sort(),
      description: raidBeforeEdit.description,
      useSrPlus: raidBeforeEdit.useSrPlus,
      allowDuplicateSr: raidBeforeEdit.allowDuplicateSr,
      srCount: raidBeforeEdit.srCount,
      time: raidBeforeEdit.time,
    }
    const b = {
      instanceId: instance?.id,
      hardReserves: hardReserves.sort(),
      description,
      useSrPlus,
      allowDuplicateSr,
      srCount,
      time: time.toISOString(),
    }
    return !deepEqual(a, b)
  }

  return (
    <>
      <Paper shadow="sm" p="sm">
        <Stack>
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
              const newInstance = instances?.find((i) => i.id == Number(v))
              setInstance(newInstance)
              if ((newInstance?.id == raidBeforeEdit?.instanceId) && useHr) {
                setHardReserves(raidBeforeEdit?.hardReserves || [])
              } else {
                setHardReserves([])
              }
            }}
          />
          <Textarea
            label="Description"
            value={description}
            autosize
            minRows={3}
            onChange={(event) => setDescription(event.currentTarget.value)}
          />
          <DateTimePicker
            value={time}
            onChange={(value) => {
              if (value) setTime(new Date(value))
            }}
            label="Date and time"
            placeholder="Pick date and time"
          />

          <Stack gap={0}>
            <Group mb={3} p={0} gap={3}>
              <Text size="sm">
                Number of soft-reserves
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
              checked={allowDuplicateSr}
              onChange={(event) =>
                setAllowDuplicateSr(event.currentTarget.checked)}
              label="Allow duplicate soft-reserves"
            />
          </Collapse>
          <Switch
            checked={useHr}
            disabled={!instance}
            onChange={(event) => {
              setUseHr(event.target.checked)
              if (!event.target.checked) setHardReserves([])
            }}
            label="Hard-reserve items"
          />
          <Collapse in={useHr && instance ? true : false}>
            {instance
              ? (
                <ItemSelect
                  withAsterisk={hardReserves.length == 0}
                  label="Select the item's you want to hard-reserve"
                  value={hardReserves}
                  onChange={setHardReserves}
                  sameItemLimit={1}
                  instance={instance}
                  itemPickerOpen={itemPickerOpen}
                />
              )
              : null}
          </Collapse>
          <Button
            mt="sm"
            onClick={() => {
              if (
                edit && (raidBeforeEdit?.instanceId != instance?.id)
              ) {
                modals.openConfirmModal({
                  title: "Are you sure?",
                  centered: true,
                  children: (
                    <Text size="sm">
                      Changing the instance will remove all exisiting
                      soft-reserves
                    </Text>
                  ),
                  labels: { confirm: "Confirm", cancel: "Cancel" },
                  confirmProps: { color: "red" },
                  onConfirm: () => createRaid(),
                })
              } else {
                createRaid()
              }
            }}
            disabled={!instance || !srCount ||
              (useHr && hardReserves.length == 0) || !raidChanged()}
          >
            {edit ? "Save changes" : "Create Raid"}
          </Button>
        </Stack>
      </Paper>
    </>
  )
}
