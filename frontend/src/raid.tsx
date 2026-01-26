import { useEffect, useState } from "react"
import type {
  GetInstancesResponse,
  GetRaidResponse,
  Instance,
  Sheet,
  User,
} from "../types/types.ts"
import { useParams } from "react-router"
import { Group, Paper, Skeleton, Stack, Title } from "@mantine/core"
import { CopyClipboardButton, raidIdToUrl } from "./copy-clipboard-button.tsx"
import { CreateSr } from "./create-sr.tsx"
import { SrList } from "./sr-list.tsx"
import { rollForExport } from "./rollfor-export.ts"
import useWebSocket from "react-use-websocket"

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
    fetch(`/api/raid/${params.raid_id}`).then((r) => r.json()).then(
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

  const raidId = globalThis.location.pathname.slice(1)

  if (sheet && instance && user) {
    return (
      <Stack>
        <Paper shadow="sm" p="sm">
          <Group justify="space-between">
            <Group wrap="nowrap">
              <Title>{instance.name}</Title>
              <CopyClipboardButton
                toClipboard={raidIdToUrl(raidId)}
                label={raidId}
                tooltip="Copy link to raid"
                orange={false}
              />
            </Group>
            <CopyClipboardButton
              toClipboard={rollForExport(sheet)}
              label="RollFor"
              tooltip="Copy RollFor export"
              onClick={() => setExportedLatestVersion(true)}
              orange={!exportedLatestVersion}
            />
          </Group>
        </Paper>
        <CreateSr
          loadRaid={loadRaid}
          items={instance.items}
          sheet={sheet}
          user={user}
        />
        <Paper shadow="sm" mb="md">
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
