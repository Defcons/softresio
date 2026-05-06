import { useEffect, useState } from "react"
import {
  Alert,
  Anchor,
  Badge,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core"
import { Link } from "react-router"
import type {
  AdminStatsResponse,
  GetInstancesResponse,
  Instance,
} from "../shared/types.ts"

const fmtTime = (iso: string | null): string => {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString()
}

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <Stack
    gap={2}
    p="md"
    style={{
      border: "1px solid var(--border)",
      borderRadius: 8,
      background: "var(--surface)",
      minWidth: 160,
      flex: 1,
    }}
  >
    <Text size="xs" c="dimmed">{label}</Text>
    <Text size="xl" fw={700} c="var(--accent)">{value}</Text>
  </Stack>
)

export const AdminPanel = ({ isAdmin }: { isAdmin: boolean }) => {
  const [stats, setStats] = useState<AdminStatsResponse["data"]>()
  const [instances, setInstances] = useState<Instance[]>([])
  const [error, setError] = useState<string>()

  const instanceName = (id: number): string => {
    const inst = instances.find((i) => i.id === id)
    return inst?.name || `instance ${id}`
  }

  useEffect(() => {
    if (!isAdmin) return
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((j: AdminStatsResponse) => {
        if (j.error) setError(j.error.message)
        else if (j.data) setStats(j.data)
      })
      .catch((e) => setError(String(e)))
    fetch("/api/instances")
      .then((r) => r.json())
      .then((j: GetInstancesResponse) => {
        if (j.data) setInstances(j.data)
      })
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <Stack p="md" gap="sm">
        <Title order={2}>Admin</Title>
        <Alert color="yellow">
          You are not on the admin allowlist. Site admins are configured via the
          {" "}
          <code>ADMIN_DISCORD_IDS</code> environment variable.
        </Alert>
      </Stack>
    )
  }

  if (error) {
    return (
      <Stack p="md" gap="sm">
        <Title order={2}>Admin</Title>
        <Alert color="red">Failed to load stats: {error}</Alert>
      </Stack>
    )
  }

  if (!stats) {
    return (
      <Stack p="md" gap="sm" align="center">
        <Loader size="sm" />
      </Stack>
    )
  }

  return (
    <Stack p="md" gap="lg">
      <Title order={2}>Admin · Site stats</Title>

      <Group gap="sm" wrap="wrap">
        <StatCard
          label="Total raids"
          value={stats.totalRaids.toLocaleString()}
        />
        <StatCard
          label="Created last 7 days"
          value={stats.recentRaids7d.toLocaleString()}
        />
        <StatCard
          label="Created last 30 days"
          value={stats.recentRaids30d.toLocaleString()}
        />
        <StatCard
          label="Total guilds"
          value={stats.totalGuilds.toLocaleString()}
        />
        <StatCard
          label="Distinct users"
          value={stats.totalUsers.toLocaleString()}
        />
      </Group>

      <Stack gap="xs">
        <Title order={4}>Top instances by raid count</Title>
        <Table withTableBorder withColumnBorders highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Instance</Table.Th>
              <Table.Th>Raids</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {stats.topInstances.map((row) => (
              <Table.Tr key={row.instanceId}>
                <Table.Td>{instanceName(row.instanceId)}</Table.Td>
                <Table.Td>{row.raidCount}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>

      <Stack gap="xs">
        <Title order={4}>Top users by raids attended</Title>
        <Table withTableBorder withColumnBorders highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>User</Table.Th>
              <Table.Th>Raids attended</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {stats.topUsers.map((row) => (
              <Table.Tr key={row.userId}>
                <Table.Td>
                  {row.username || (
                    <Text size="xs" c="dimmed">
                      anon · {row.userId.slice(0, 8)}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>{row.raidCount}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>

      <Stack gap="xs">
        <Title order={4}>Top items reserved</Title>
        <Table withTableBorder withColumnBorders highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Item ID</Table.Th>
              <Table.Th>Times reserved</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {stats.topItems.map((row) => (
              <Table.Tr key={row.itemId}>
                <Table.Td>
                  <Anchor
                    href={`https://epochhead.com/item=${row.itemId}`}
                    target="_blank"
                    rel="noopener"
                  >
                    {row.itemId}
                  </Anchor>
                </Table.Td>
                <Table.Td>{row.reserveCount}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>

      <Stack gap="xs">
        <Title order={4}>Recent raids (last 50 by activity)</Title>
        <Table withTableBorder withColumnBorders highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Raid</Table.Th>
              <Table.Th>Instance</Table.Th>
              <Table.Th>Owner</Table.Th>
              <Table.Th>Attendees</Table.Th>
              <Table.Th>SRs</Table.Th>
              <Table.Th>Locked</Table.Th>
              <Table.Th>Last activity</Table.Th>
              <Table.Th>Scheduled</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {stats.recentRaids.map((row) => (
              <Table.Tr key={row.id}>
                <Table.Td>
                  <Anchor component={Link} to={`/${row.id}`}>{row.id}</Anchor>
                </Table.Td>
                <Table.Td>{instanceName(row.instanceId)}</Table.Td>
                <Table.Td>
                  {row.ownerName || (
                    <Text size="xs" c="dimmed">
                      anon · {row.ownerUserId.slice(0, 8)}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>{row.attendeeCount}</Table.Td>
                <Table.Td>{row.srCount}</Table.Td>
                <Table.Td>
                  {row.locked
                    ? <Badge size="xs" color="red">locked</Badge>
                    : <Badge size="xs" color="green">open</Badge>}
                </Table.Td>
                <Table.Td>{fmtTime(row.latestActivity)}</Table.Td>
                <Table.Td>{fmtTime(row.time)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Stack>
  )
}
