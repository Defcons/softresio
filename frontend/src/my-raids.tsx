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

  function idToInstance(id: number): string {
    if (!instances) return ""
    const matches = instances.filter((instance) => instance.id == id)
    return matches[0].name
  }

  return (
    <Stack>
      {!instances || !raidList || !user
        ? Array.from({ length: 10 }).map((_, i) => <Skeleton h={48} key={i} />)
        : raidList.map((raid) => (
          <Box
            onClick={() => navigate(`/${raid.sheet.raidId}`)}
            key={raid.sheet.raidId}
          >
            <Paper shadow="sm" p="sm" className="raid-list-element">
              <Group wrap="nowrap" justify="space-between">
                <Group gap="xs">
                  <Title variant="default" c="orange" lineClamp={1} order={5}>
                    {idToInstance(raid.sheet.instanceId)}
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
