import type { ReactElement } from "react"
import { useHover } from "@mantine/hooks"
import { LongPressCallbackReason, useLongPress } from "use-long-press"
import type { Attendee, Item, User } from "../types/types.ts"
import { type RowComponentProps } from "react-window"
import {
  Badge,
  Checkbox,
  CloseButton,
  Group,
  Image,
  Title,
  Tooltip,
} from "@mantine/core"

export const ItemNameAndIcon = (
  { item, showTooltipItemId, highlight, onClick, onLongClick, rightSection }: {
    item: Item
    showTooltipItemId?: number
    highlight: boolean
    onClick: () => void
    onLongClick: () => void
    rightSection?: ReactElement
  },
) => {
  const { hovered, ref } = useHover()
  const isTouchScreen = globalThis.matchMedia("(pointer: coarse)").matches
  const handlers = useLongPress(() => onLongClick(), {
    onCancel: (_, meta) => {
      if (meta.reason == LongPressCallbackReason.CancelledByRelease) {
        setTimeout(() => onClick(), 50)
      }
    },
  })

  return (
    <Tooltip
      m={0}
      p={0}
      key={item.id}
      opened={showTooltipItemId == item.id || (!isTouchScreen && hovered)}
      label={
        <div
          className="tt-wrap"
          dangerouslySetInnerHTML={{ __html: item.tooltip }}
        />
      }
    >
      <Group
        {...handlers()}
        ref={ref}
        justify="space-between"
        wrap="nowrap"
        className={`item-list-element ${
          highlight || (hovered && !isTouchScreen)
            ? "item-list-element-highlight"
            : ""
        }`}
        p={8}
        key={item.id}
      >
        <Group wrap="nowrap">
          <Image
            onClick={(e) => {
              e.stopPropagation()
              globalThis.open(
                `https://database.turtlecraft.gg/?item=${item.id}`,
              )
            }}
            style={{
              filter: "drop-shadow(0px 0px 2px)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
            className={`q${item.quality}`}
            radius="sm"
            h={24}
            w={24}
            src={`https://database.turtlecraft.gg/images/icons/medium/${item.icon}`}
          />
          <Title className={`q${item.quality}`} order={6} lineClamp={1}>
            {item.name}
          </Title>
        </Group>
        {rightSection}
      </Group>
    </Tooltip>
  )
}

const ReservedByOthers = (
  { itemId, user, attendees }: {
    itemId: number
    user: User
    attendees: Attendee[]
  },
) => {
  const otherSRs =
    attendees.flatMap((attendee) =>
      attendee.softReserves.map((softReserve) => ({
        softReserve,
        userId: attendee.user.userId,
      }))
    ).filter(({ softReserve, userId }) =>
      softReserve.itemId == itemId && userId !== user.userId
    ).length
  return otherSRs > 0 ? <Badge circle color="orange">{otherSRs}</Badge> : null
}

export const SelectableItem = ({
  item,
  onItemClick,
  onItemLongClick,
  selectedItemIds,
  showTooltipItemId,
  user,
  attendees,
  deleteMode,
}: {
  onItemClick: (itemId: number) => void
  onItemLongClick: (itemId: number) => void
  selectedItemIds?: number[]
  showTooltipItemId?: number
  item: Item
  user: User
  attendees: Attendee[]
  deleteMode?: boolean
  style?: React.CSSProperties
}) => {
  const highlight = showTooltipItemId == item.id ||
    (selectedItemIds || []).includes(item.id)

  return (
    <ItemNameAndIcon
      item={item}
      showTooltipItemId={showTooltipItemId}
      highlight={highlight}
      onClick={() => onItemClick(item.id)}
      onLongClick={() => onItemLongClick(item.id)}
      rightSection={
        <Group wrap="nowrap">
          <ReservedByOthers
            itemId={item.id}
            user={user}
            attendees={attendees}
          />
          {deleteMode ? <CloseButton /> : (
            <Checkbox
              checked={selectedItemIds?.includes(item.id)}
              size="md"
            />
          )}
        </Group>
      }
    />
  )
}

export const ReactWindowSelectableItem = ({
  index,
  selectedItemIds,
  onItemClick,
  onItemLongClick,
  showTooltipItemId,
  user,
  style,
  deleteMode = false,
  items,
  attendees,
}: RowComponentProps<{
  onItemClick: (item_id: number) => void
  onItemLongClick: (item_id: number) => void
  selectedItemIds: number[]
  user: User
  showTooltipItemId?: number
  deleteMode?: boolean
  items: Item[]
  attendees: Attendee[]
}>) => {
  return (
    <SelectableItem
      item={items[index]}
      selectedItemIds={selectedItemIds}
      onItemClick={onItemClick}
      onItemLongClick={onItemLongClick}
      showTooltipItemId={showTooltipItemId}
      user={user}
      deleteMode={deleteMode}
      style={style}
      attendees={attendees}
    />
  )
}
