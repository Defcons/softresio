import type { ReactElement } from "react"
import type { Activity, Attendee, Item, User } from "../shared/types.ts"
import { Group, Modal, Table, Text, Tooltip } from "@mantine/core"
import { formatDistanceToNow } from "date-fns"
import { formatTime } from "../shared/utils.ts"
import { nothingItem } from "./mock-item.ts"

const ActivityLogElement = (
  { activity, admins, owner, items, attendees, index }: {
    activity: Activity
    admins: User[]
    owner: User
    items: Item[]
    index: number
    attendees: Attendee[]
  },
) => {
  return (
    <Table.Tr>
      <Table.Td>
        <Tooltip label={formatTime(activity.time)}>
          <Text size="sm">
            {formatDistanceToNow(activity.time, { addSuffix: true })}
          </Text>
        </Tooltip>
      </Table.Td>
      <Table.Td>
        {activity.type == "RaidChanged" ? `Raid was ${activity.change}` : null}
        {activity.type == "AdminChanged"
          ? (
            <Group>
              <Tooltip
                target={`#activity-${index}`}
                label={activity.byUser.userId}
              />
              <Text size="sm">
                <b id={`activity-${index}`}>
                  {activity.character?.name || "User"}
                </b>
                was {activity.change}{" "}
                {activity.change == "promoted" ? "to" : "as"} admin
              </Text>
            </Group>
          )
          : null}
        {activity.type == "SrChanged"
          ? (
            <Group>
              <Tooltip
                target={`#activity-${index}`}
                label={activity.byUser.userId}
              />
              <Text size="sm">
                <b id={`activity-${index}`}>
                  {activity.character?.name || "User"}
                </b>
                {activity.change == "deleted" ? "'s " : " "}
                {activity.change == "created"
                  ? "soft-reserved "
                  : "soft-reserve of "}
                <b
                  className={`q${
                    (items.find((i) => i.id == activity.itemId) ||
                      nothingItem).quality
                  }`}
                >
                  [{(items.find((i) => i.id == activity.itemId) ||
                    nothingItem).name}]
                </b>
                {activity.change == "deleted" ? " was deleted" : null}
              </Text>
            </Group>
          )
          : null}
      </Table.Td>
      <Table.Td>
        <Tooltip label={activity.byUser.userId}>
          <Text fw={600} size="sm">
            {attendees.find((a) => a.user.userId == activity.byUser.userId)
              ?.character.name ||
              (activity.byUser.userId == owner.userId && "Owner") ||
              admins.find((a) => a.userId == activity.byUser.userId) &&
                "Admin" ||
              "User"}
          </Text>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  )
}

export const ActivityLog = (
  { open, activityLog, onClose, owner, admins, items, attendees }: {
    open: boolean
    admins: User[]
    items: Item[]
    owner: User
    attendees: Attendee[]
    activityLog: Activity[]
    onClose: () => void
  },
) => {
  const elements: ReactElement[] = []
  activityLog.sort((a, b) => a.time.localeCompare(b.time)).reverse()
  activityLog.map((activity, index) =>
    elements.push(
      <ActivityLogElement
        key={index}
        owner={owner}
        admins={admins}
        activity={activity}
        index={index}
        items={items}
        attendees={attendees}
      />,
    )
  )
  return (
    <Modal
      size="auto"
      opened={open}
      onClose={onClose}
      withCloseButton
      styles={{
        body: { height: "90dvh" },
      }}
      padding="sm"
    >
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Time</Table.Th>
            <Table.Th>Event</Table.Th>
            <Table.Th>By</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {elements}
        </Table.Tbody>
      </Table>
    </Modal>
  )
}
