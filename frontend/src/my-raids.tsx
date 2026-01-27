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

const MyRaidItem = (
  { user, instances, raids }: {
    user: User
    instances: Instance[]
    raids: Raid[]
  },
) => {
  const navigate = useNavigate()

  const idToInstance = (id: number): Instance =>
    instances.filter((instance) => instance.id == id)[0]

  return (
    <Stack>
      {raids.map((raid) => (
        <Box
          onClick={() => navigate(`/${raid.sheet.raidId}`)}
          key={raid.sheet.raidId}
        >
          <Paper shadow="sm" p="sm" className="raid-list-element">
            <Group wrap="nowrap" justify="space-between">
              <Group gap="xs">
                <Title
                  w={45}
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
                <Group
                  style={{
                    visibility:
                      raid.sheet.admins.some((e) => e.userId == user.userId)
                        ? "visible"
                        : "hidden",
                  }}
                >
                  <IconShieldFilled size={20} />
                </Group>
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

export const MyRaids = () => {
  const [raidList, setRaidList] = useState<Raid[]>()
  const [instances, setInstances] = useState<Instance[]>()
  const [user, setUser] = useState<User>()

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

  raidList.sort((raid1, raid2) =>
    Date.parse(raid2.sheet.time) - Date.parse(raid1.sheet.time)
  )

  const upcomingRaids = []
  const pastRaids = []

  const now = (new Date()).getTime()
  for (const raid of raidList) {
    if (new Date(raid.sheet.time).getTime() >= now) {
      upcomingRaids.push(raid)
    } else {
      pastRaids.push(raid)
    }
  }

  return (
    <Stack>
      {upcomingRaids.length != 0
        ? (
          <>
            <Title order={4}>Upcoming</Title>
            <MyRaidItem
              user={user}
              instances={instances}
              raids={upcomingRaids}
            />
          </>
        )
        : null}
      {pastRaids.length != 0
        ? (
          <>
            <Title order={4}>Past</Title>
            <MyRaidItem user={user} instances={instances} raids={pastRaids} />
          </>
        )
        : null}
    </Stack>
  )
}
