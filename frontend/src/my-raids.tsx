import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Anchor, Button, CopyButton, Paper, Table, Text } from "@mantine/core"
import { useNavigate } from "react-router"
import type {
  GetInstancesResponse,
  GetMyRaidsResponse,
  Instance,
  Raid,
} from "../types/types.ts"
export const MyRaids = () => {
  const [raidList, setRaidList] = useState<Raid[]>()
  const [instances, setInstances] = useState<Instance[]>()

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
        }
      })
  }, [])

  function idToInstance(id: number): string {
    if (!instances) return ""
    const matches = instances.filter((instance) => instance.id == id)
    return matches[0].name
  }

  const raidLinks = raidList?.map((raid) => {
    if (!instances || !raidList) {
      return <></>
    }
    const instanceName = idToInstance(raid.sheet.instanceId)
    return (
      <Table.Tr>
        <Table.Td>
          <Anchor
            onClick={() => navigate(`/${raid.sheet.raidId}`)}
            key={raid.sheet.raidId}
          >
            <Text>{instanceName}</Text>
          </Anchor>
        </Table.Td>
        <Table.Td>
          {formatDistanceToNow(raid.sheet.time, { addSuffix: true })}
        </Table.Td>
        <Table.Td>
          <CopyButton
            value={`${window.location.protocol}//${window.location.hostname}${
              window.location.hostname == "localhost"
                ? `:${window.location.port}`
                : ""
            }/${raid.sheet.raidId}`}
          >
            {({ copied, copy }) => (
              <Button variant={copied ? "default" : ""} onClick={copy} w="100%">
                {copied ? "yoink" : raid.sheet.raidId}
              </Button>
            )}
          </CopyButton>
        </Table.Td>
      </Table.Tr>
    )
  })

  return (
    <Paper shadow="sm" p="sm">
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>
              Instance
            </Table.Th>
            <Table.Th>
              Time
            </Table.Th>
            <Table.Th w={110}>
              Share link
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {raidLinks}
        </Table.Tbody>
      </Table>
    </Paper>
  )
}
