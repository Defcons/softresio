import { useEffect, useState } from "react"
import type {
  GetInstancesResponse,
  GetRaidResponse,
  Instance,
  Sheet,
  User,
} from "../types/types.ts"
import { useParams } from "react-router"
import {
  Badge,
  Button,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { CopyClipboardButton, raidIdToUrl } from "./copy-clipboard-button.tsx"
import { CreateSr } from "./create-sr.tsx"
import { SrList } from "./sr-list.tsx"
import { rollForExport } from "./rollfor-export.ts"
import useWebSocket from "react-use-websocket"
import { IconLogs } from "@tabler/icons-react"
import { IconShieldFilled } from "@tabler/icons-react"

export const RaidUpdater = (
  { loadRaid, raidId }: { loadRaid: (sheet: Sheet) => void; raidId: string },
) => {
  const { lastMessage } = useWebSocket(`/api/ws/${raidId}`, {
    shouldReconnect: (_) => true,
  })
  useEffect(() => {
    if (lastMessage?.data) {
      loadRaid(JSON.parse(lastMessage.data))
    }
  }, [lastMessage])
  return null
}

export const Raid = () => {
  const params = useParams()
  const [sheet, setSheet] = useState<Sheet>()
  const [user, setUser] = useState<User>()
  const [instance, setInstance] = useState<Instance>()
  const [instances, setInstances] = useState<Instance[]>()
  const [exportedLatestVersion, setExportedLatestVersion] = useState(false)

  const loadRaid = (sheet?: Sheet) => {
    setExportedLatestVersion(false)
    if (sheet) {
      return setSheet(sheet)
    }
    fetch(`/api/raid/${params.raidId}`).then((r) => r.json()).then(
      (j: GetRaidResponse) => {
        if (j.error) {
          alert(j.error)
        } else if (j.data) {
          setUser(j.user)
          setSheet(j.data)
        }
      },
    )
  }

  const lockRaid = () => {
    fetch(`/api/raid/lock/${params.raidId}`, { method: "POST" }).then((r) =>
      r.json()
    ).then(
      (j: GetRaidResponse) => {
        if (j.error) {
          alert(j.error)
        } else if (j.data) {
          loadRaid(j.data)
        }
      },
    )
  }

  useEffect(loadRaid, [])

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
    if (sheet && instances) {
      const matches = instances.filter((i: Instance) =>
        i.id == sheet.instanceId
      )
      if (matches.length == 1) {
        setInstance(matches[0])
      } else {
        alert("Could not find instance")
      }
    }
  }, [sheet, instances])

  const isAdmin = sheet?.admins.some((u) => u.userId == user?.userId) || false

  if (sheet && instance && user) {
    return (
      <Stack>
        <Paper shadow="sm" p="sm">
          <Stack>
            <Group justify="space-between">
              <Group>
                <Stack>
                  <Title lineClamp={1} order={3}>{instance.name}</Title>
                </Stack>
              </Group>
              {sheet.locked ? <Badge color="red">Locked</Badge> : null}
            </Group>
            {sheet.description ? <Text>{sheet.description}</Text> : null}
          </Stack>
        </Paper>
        <Paper shadow="sm" p="sm" display={isAdmin ? "block" : "none"}>
          <Stack gap={0}>
            <Group justify="space-between">
              <Group>
                <CopyClipboardButton
                  toClipboard={raidIdToUrl(params.raidId || "")}
                  label={params.raidId || ""}
                  tooltip="Copy link to raid"
                  orange={false}
                />
                <Button
                  onClick={lockRaid}
                  variant={sheet.locked ? "default" : ""}
                  color="red"
                >
                  {sheet.locked ? "Unlock" : "Lock"}
                </Button>
              </Group>
              <IconShieldFilled size={20} />
            </Group>
          </Stack>
        </Paper>
        <CreateSr
          loadRaid={loadRaid}
          items={instance.items}
          sheet={sheet}
          user={user}
        />
        <Paper shadow="sm" mb="md">
          <Group p="sm" justify="space-between">
            <Button
              disabled
              variant="default"
              leftSection={<IconLogs size={16} />}
            >
              Log
            </Button>
            <CopyClipboardButton
              toClipboard={rollForExport(sheet)}
              label="RollFor"
              tooltip="Copy RollFor export"
              onClick={() => setExportedLatestVersion(true)}
              orange={!exportedLatestVersion}
            />
          </Group>
          {sheet.attendees.length > 0
            ? <SrList attendees={sheet.attendees} items={instance.items} />
            : null}
        </Paper>
        <RaidUpdater raidId={sheet.raidId} loadRaid={loadRaid} />
      </Stack>
    )
  } else {
    return (
      <Stack>
        <Skeleton h={68}>
        </Skeleton>
        <Skeleton h={404}>
        </Skeleton>
      </Stack>
    )
  }
}
