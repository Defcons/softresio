import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Box, Group, Paper, Skeleton, Stack, Text, Title } from "@mantine/core"
import { useNavigate } from "react-router"
import type {
  GetInstancesResponse,
  GetMyRaidsResponse,
  Instance,
  Raid,
  User,
} from "../types/types.ts"
import { IconShieldFilled, IconUserFilled } from "@tabler/icons-react"

export const MyRaids = () => {
  const [raidList, setRaidList] = useState<Raid[]>()
  const [instances, setInstances] = useState<Instance[]>()
  const [user, setUser] = useState<User>()

  const navigate = useNavigate()

  useEffect(() => {
    fetch(`/api/raids`).then((r) => {
      return r.json()
    }).then(
      (j: GetMyRaidsResponse) => {
        if (j.error) {
          alert(j.error)
        } else if (j.data) {
          setRaidList(j.data)
          setUser(j.user)
        }
      },
    )
  }, [])

  useEffect(() => {
    fetch("/api/instances")
      .then((r) => r.json())
      .then((j: GetInstancesResponse) => {
        if (j.error) {
          alert(j.error)
        } else if (j.data) {
          setInstances(j.data)
          setUser(j.user)
        }
      })
  }, [])

  if (!instances || !raidList || !user) {
    return (
      <Stack>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton h={48} key={i} />)}
      </Stack>
    )
  }

  const idToInstance = (id: number): Instance =>
    instances.filter((instance) => instance.id == id)[0]

  return (
    <Stack>
      {raidList.map((raid) => (
        <Box
          onClick={() => navigate(`/${raid.sheet.raidId}`)}
          key={raid.sheet.raidId}
        >
          <Paper shadow="sm" p="sm" className="raid-list-element">
            <Group wrap="nowrap" justify="space-between">
              <Group gap="xs">
                <Title
                  w={30}
                  variant="default"
                  c="orange"
                  lineClamp={1}
                  order={5}
                >
                  {idToInstance(raid.sheet.instanceId).shortname.toUpperCase()}
                </Title>
                <Title
                  variant="default"
                  lineClamp={1}
                  order={5}
                  visibleFrom="sm"
                >
                  {idToInstance(raid.sheet.instanceId).name}
                </Title>
              </Group>
              <Group wrap="nowrap" gap="xs">
                <Text lineClamp={1}>
                  {formatDistanceToNow(raid.sheet.time, { addSuffix: true })}
                </Text>
                {raid.sheet.admins.some((e) => e.userId == user.userId)
                  ? <IconShieldFilled size={20} />
                  : null}
                <Group gap={3} miw={45}>
                  <IconUserFilled size={20} />
                  <Title order={6}>{raid.sheet.attendees.length}</Title>
                </Group>
              </Group>
            </Group>
          </Paper>
        </Box>
      ))}
    </Stack>
  )
}
