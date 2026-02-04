import { useState } from "react"
import type {
  SrPlus,
  SrPlusManualChangeRequest,
  SrPlusManualChangeResponse,
} from "../shared/types.ts"
import {
  Anchor,
  Button,
  Modal,
  NumberInput,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core"
import { formatDistanceToNow } from "date-fns"
import { formatTime, raidIdToUrl } from "../shared/utils.ts"

export const SrPlusLog = (
  { srPluses, open, onClose, characterName, itemId, guildId }: {
    srPluses: SrPlus[]
    characterName: string
    itemId: number
    guildId: string
    open: boolean
    onClose: () => void
  },
) => {
  const [changeSrPlus, setChangeSrPlus] = useState(srPluses.length * 10)

  const submit = () => {
    const request: SrPlusManualChangeRequest = {
      guildId,
      characterName,
      itemId,
      value: changeSrPlus,
    }

    fetch(`/api/srplus`, { method: "POST", body: JSON.stringify(request) })
      .then(
        (r) => r.json(),
      ).then(
        (j: SrPlusManualChangeResponse) => {
          if (j.error) {
            alert(j.error.message)
          } else if (j.data) {
            alert("SR+ set")
          }
        },
      )
  }

  return (
    <Modal
      title={`${srPluses[0]?.characterName}'s SR+ History`}
      size="auto"
      opened={open}
      onClose={onClose}
      withCloseButton
      padding="sm"
    >
      <Stack mb="md">
        <Stack>
          <NumberInput
            ta="right"
            value={changeSrPlus}
            onChange={(e) => setChangeSrPlus(Number(e))}
            step={10}
            max={1000}
          />
          <Button
            onClick={submit}
            disabled={changeSrPlus === (srPluses.length * 10)}
          >
            Set SR+
          </Button>
        </Stack>
      </Stack>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Time</Table.Th>
            <Table.Th>Source</Table.Th>
            <Table.Th>Change</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {srPluses.sort((a, b) => b.time.localeCompare(a.time)).map((
            srPlus,
          ) => (
            <Table.Tr>
              <Table.Td>
                <Tooltip label={formatTime(srPlus.time)}>
                  <Text size="sm">
                    {formatDistanceToNow(srPlus.time, { addSuffix: true })}
                  </Text>
                </Tooltip>
              </Table.Td>
              <Table.Td>
                {srPlus.type == "raid"
                  ? (
                    <Anchor size="sm" href={raidIdToUrl(srPlus.raidId)}>
                      {raidIdToUrl(srPlus.raidId)}
                    </Anchor>
                  )
                  : "Manual"}
              </Table.Td>
              <Table.Td>
                <Text size="sm">
                  {srPlus.type == "raid" ? "+10" : "=" + srPlus.value}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Modal>
  )
}
