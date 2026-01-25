import { useEffect, useState } from "react"
import type {
  GetInstancesResponse,
  GetRaidResponse,
  Instance,
  Sheet,
  User,
} from "../types/types.ts"
import { IconCopy } from "@tabler/icons-react"
import { useParams } from "react-router"
import {
  Button,
  CopyButton,
  Group,
  Paper,
  Skeleton,
  Stack,
  Title,
  Tooltip,
} from "@mantine/core"
import { CreateSr } from "./create-sr.tsx"
import { SrList } from "./sr-list.tsx"
import { rollForExport } from "./rollfor-export"
import { CopyRaidLink } from "./copy-raid-link"
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

  if (sheet && instance && user) {
    return (
      <Stack>
        <Paper shadow="sm" p="sm">
          <Group justify="space-between">
            <Title>{instance.name}</Title>
            <Group wrap="nowrap">
              <CopyButton value={rollForExport(sheet)} timeout={2000}>
                {({ copied, copy }) => (
                  <Tooltip
                    label={copied ? "Copied!" : "Copy RollFor export"}
                    withArrow
                    position="top"
                  >
                    <Button
                      onClick={() => {
                        setExportedLatestVersion(true)
                        copy()
                      }}
                      variant={exportedLatestVersion ? "default" : ""}
                      leftSection={<IconCopy size={16} />}
                    >
                      RollFor
                    </Button>
                  </Tooltip>
                )}
              </CopyButton>
              <CopyRaidLink raidId={window.location.pathname.slice(1)} />
            </Group>
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
