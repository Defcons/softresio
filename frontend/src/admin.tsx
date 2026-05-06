import { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Anchor,
  Badge,
  Group,
  Image,
  Loader,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core"
import { Link } from "react-router"
import type {
  AdminStatsRecentRaid,
  AdminStatsResponse,
  AdminStatsTopUser,
  GetInstancesResponse,
  Instance,
  Item,
} from "../shared/types.ts"

const fmtTime = (iso: string | null): string => {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString()
}

// Display label preference order:
//   1. Discord username (from JWT)
//   2. Most-frequently-used character name (from raid attendances)
//   3. Anonymous fallback with truncated UUID
const userDisplay = (
  row: {
    username: string | null
    topCharacter?: string | null
    userId: string
  },
): { label: string; isAnon: boolean } => {
  if (row.username) return { label: row.username, isAnon: false }
  if (row.topCharacter) return { label: row.topCharacter, isAnon: false }
  return { label: `anon · ${row.userId.slice(0, 8)}`, isAnon: true }
}

const ownerDisplay = (
  row: AdminStatsRecentRaid,
): { label: string; isAnon: boolean } => {
  if (row.ownerName) return { label: row.ownerName, isAnon: false }
  if (row.ownerCharacter) return { label: row.ownerCharacter, isAnon: false }
  return { label: `anon · ${row.ownerUserId.slice(0, 8)}`, isAnon: true }
}

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <Stack
    gap={2}
    p="md"
    style={{
      border: "1px solid var(--border)",
      borderRadius: 8,
      background: "var(--surface)",
      minWidth: 140,
      flex: 1,
    }}
  >
    <Text size="xs" c="dimmed">{label}</Text>
    <Text size="xl" fw={700} c="var(--accent)">{value}</Text>
  </Stack>
)

// Wraps a stats table in a card with a title — keeps the panels visually
// distinct when laid out side-by-side.
const Panel = (
  { title, children }: { title: string; children: React.ReactNode },
) => (
  <Stack
    gap="xs"
    p="md"
    style={{
      border: "1px solid var(--border)",
      borderRadius: 8,
      background: "var(--surface)",
    }}
  >
    <Title order={5} c="var(--accent)">{title}</Title>
    {children}
  </Stack>
)

const ItemCell = (
  { item, itemId }: { item: Item | undefined; itemId: number },
) => {
  const iconUrl = item?.icon
    ? `https://wow.zamimg.com/images/wow/icons/medium/${item.icon}`
    : null
  return (
    <Tooltip
      multiline
      disabled={!item?.tooltip}
      label={
        <div
          className="tooltip"
          dangerouslySetInnerHTML={{ __html: item?.tooltip || "" }}
        />
      }
    >
      <Anchor
        href={`https://epochhead.com/?item=${itemId}`}
        target="_blank"
        rel="noopener"
        underline="never"
      >
        <Group gap={8} wrap="nowrap">
          {iconUrl
            ? (
              <Image
                src={iconUrl}
                w={22}
                h={22}
                radius="sm"
                className={item ? `q${item.quality}` : undefined}
              />
            )
            : <div style={{ width: 22, height: 22 }} />}
          <Text size="sm" className={item ? `q${item.quality}` : undefined}>
            {item?.name || `item ${itemId}`}
          </Text>
        </Group>
      </Anchor>
    </Tooltip>
  )
}

export const AdminPanel = ({ isAdmin }: { isAdmin: boolean }) => {
  const [stats, setStats] = useState<AdminStatsResponse["data"]>()
  const [instances, setInstances] = useState<Instance[]>([])
  const [error, setError] = useState<string>()
  // Test/abandoned raids (typically 0–2 attendees) clutter the recent-raids
  // list. Hide them by default but offer a toggle for full transparency.
  const [showLowAttendance, setShowLowAttendance] = useState(false)

  // Flatten the per-instance items list into a single id→Item map. Memoised
  // because the instances list is stable for the panel's lifetime.
  const itemMap = useMemo(() => {
    const m = new Map<number, Item>()
    for (const inst of instances) {
      for (const item of inst.items || []) m.set(item.id, item)
    }
    return m
  }, [instances])

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

  const visibleRaids = showLowAttendance
    ? stats.recentRaids
    : stats.recentRaids.filter((r) => r.attendeeCount >= 3)
  const hiddenCount = stats.recentRaids.length - visibleRaids.length

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

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Panel title="Top instances by raid count">
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
        </Panel>

        <Panel title="Top users by raids attended">
          <Table withTableBorder withColumnBorders highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th>
                <Table.Th>Raids</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {stats.topUsers.map((row: AdminStatsTopUser) => {
                const d = userDisplay(row)
                return (
                  <Table.Tr key={row.userId}>
                    <Table.Td>
                      {d.isAnon
                        ? <Text size="xs" c="dimmed">{d.label}</Text>
                        : <Text size="sm">{d.label}</Text>}
                    </Table.Td>
                    <Table.Td>{row.raidCount}</Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        </Panel>

        <Panel title="Top items reserved">
          <Table withTableBorder withColumnBorders highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Item</Table.Th>
                <Table.Th>Reserves</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {stats.topItems.map((row) => (
                <Table.Tr key={row.itemId}>
                  <Table.Td>
                    <ItemCell
                      item={itemMap.get(row.itemId)}
                      itemId={row.itemId}
                    />
                  </Table.Td>
                  <Table.Td>{row.reserveCount}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Panel>
      </SimpleGrid>

      <Panel title="Recent raids (last 50 by activity)">
        <Group justify="space-between" align="center">
          <Text size="xs" c="dimmed">
            {hiddenCount > 0 && !showLowAttendance
              ? `${hiddenCount} test raid${
                hiddenCount === 1 ? "" : "s"
              } hidden (< 3 attendees)`
              : `${visibleRaids.length} raid${
                visibleRaids.length === 1 ? "" : "s"
              } shown`}
          </Text>
          <Switch
            size="xs"
            label="Include test raids (< 3 attendees)"
            checked={showLowAttendance}
            onChange={(e) => setShowLowAttendance(e.currentTarget.checked)}
          />
        </Group>
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
            {visibleRaids.map((row) => {
              const o = ownerDisplay(row)
              return (
                <Table.Tr key={row.id}>
                  <Table.Td>
                    <Anchor component={Link} to={`/${row.id}`}>
                      {row.id}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>{instanceName(row.instanceId)}</Table.Td>
                  <Table.Td>
                    {o.isAnon
                      ? <Text size="xs" c="dimmed">{o.label}</Text>
                      : <Text size="sm">{o.label}</Text>}
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
              )
            })}
          </Table.Tbody>
        </Table>
      </Panel>
    </Stack>
  )
}
