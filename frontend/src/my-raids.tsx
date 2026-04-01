import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  Button,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core"
import { useHover } from "@mantine/hooks"
import { NavLink, useNavigate } from "react-router"
import type {
  GetInstancesResponse,
  GetMyRaidsResponse,
  Instance,
  Raid,
  User,
} from "../shared/types.ts"
import { IconShieldFilled, IconUserFilled } from "@tabler/icons-react"
import { formatTime } from "../shared/utils.ts"

const MyRaidItem = (
  { user, instances, raid }: {
    user: User
    instances: Instance[]
    raid: Raid
  },
) => {
  const { hovered, ref } = useHover()

  const idToInstance = (id: number): Instance =>
    instances.filter((instance) => instance.id == id)[0]

  return (
    <NavLink
      to={`/${raid.id}`}
      key={raid.id}
    >
      <Paper
        ref={ref}
        shadow="sm"
        p="sm"
        className={hovered ? "list-element-highlight" : "list-element"}
      >
        <Group wrap="nowrap" justify="space-between">
          <Group gap="xs">
            <Title
              w={45}
              variant="default"
              c="orange"
              lineClamp={1}
              order={5}
            >
              {idToInstance(raid.instanceId).shortname.toUpperCase()}
            </Title>
            <Title
              variant="default"
              lineClamp={1}
              order={5}
              c="var(--mantine-color-text)"
              visibleFrom="sm"
            >
              {idToInstance(raid.instanceId).name}
            </Title>
          </Group>
          <Group wrap="nowrap" gap="xs">
            <Tooltip label={formatTime(raid.time)}>
              <Text c="var(--mantine-color-text)" lineClamp={1}>
                {formatDistanceToNow(raid.time, { addSuffix: true })}
              </Text>
            </Tooltip>
            <Group
              style={{
                visibility: raid.admins.some((e) => e.userId == user.userId)
                  ? "visible"
                  : "hidden",
              }}
            >
              <IconShieldFilled
                color={raid.owner.userId == user.userId
                  ? "var(--mantine-color-orange-text)"
                  : "var(--mantine-color-text)"}
                size={20}
              />
            </Group>
            <Group gap={3} miw={45}>
              <IconUserFilled
                color="var(--mantine-color-text)"
                size={20}
              />
              <Title
                c="var(--mantine-color-text)"
                order={6}
              >
                {raid.attendees.length}
              </Title>
            </Group>
          </Group>
        </Group>
      </Paper>
    </NavLink>
  )
}

export const MyRaids = ({ user }: { user: User }) => {
  const [raidList, setRaidList] = useState<Raid[]>()
  const [instances, setInstances] = useState<Instance[]>()
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`/api/raids`).then((r) => {
      return r.json()
    }).then(
      (j: GetMyRaidsResponse) => {
        if (j.error) {
          alert(j.error.message)
        } else if (j.data) {
          setRaidList(j.data)
        }
      },
    )
  }, [user])

  useEffect(() => {
    fetch("/api/instances")
      .then((r) => r.json())
      .then((j: GetInstancesResponse) => {
        if (j.error) {
          alert(j.error.message)
        } else if (j.data) {
          setInstances(j.data)
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
    Date.parse(raid2.time) - Date.parse(raid1.time)
  )

  const upcomingRaids = []
  const pastRaids = []

  const now = (new Date()).getTime()
  for (const raid of raidList) {
    if (new Date(raid.time).getTime() >= now) {
      upcomingRaids.push(raid)
    } else {
      pastRaids.push(raid)
    }
  }

  const createRaidButton = (
    <Button onClick={() => navigate("/create")}>Create Raid</Button>
  )

  return (
    <Stack>
      {upcomingRaids.length == 0 && pastRaids.length == 0
        ? createRaidButton
        : null}
      {upcomingRaids.length != 0
        ? (
          <>
            <Group justify="space-between">
              <Title order={4}>Upcoming</Title>
              {createRaidButton}
            </Group>
            <Stack>
              {upcomingRaids.map((raid) => (
                <MyRaidItem user={user} instances={instances} raid={raid} />
              ))}
            </Stack>
          </>
        )
        : null}
      {pastRaids.length != 0
        ? (
          <>
            <Group justify="space-between">
              <Title order={4}>Past</Title>
              {upcomingRaids.length == 0 ? createRaidButton : null}
            </Group>
            <Stack>
              {pastRaids.map((raid) => (
                <MyRaidItem user={user} instances={instances} raid={raid} />
              ))}
            </Stack>
          </>
        )
        : null}
    </Stack>
  )
}
