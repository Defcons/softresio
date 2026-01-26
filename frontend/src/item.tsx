import type { ReactElement } from "react"
import { useHover } from "@mantine/hooks"
import { LongPressCallbackReason, useLongPress } from "use-long-press"
import type { Attendee, Item, User } from "../types/types.ts"
import { type RowComponentProps } from "react-window"
import {
  Badge,
  Box,
  Checkbox,
  CloseButton,
  Flex,
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
    onClick?: () => void
    onLongClick?: () => void
    rightSection?: ReactElement
  },
) => {
  const { hovered, ref } = useHover()
  const isTouchScreen = globalThis.matchMedia("(pointer: coarse)").matches
  const handlers = useLongPress(() => onLongClick?.(), {
    onCancel: (_, meta) => {
      if (meta.reason == LongPressCallbackReason.CancelledByRelease) {
        setTimeout(() => onClick?.(), 50)
      }
    },
  })

  const padding = 6

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
      <Flex
        ref={ref}
        justify="space-between"
        wrap="nowrap"
        className={`item-list-element ${
          highlight || (hovered && !isTouchScreen)
            ? "item-list-element-highlight"
            : ""
        }`}
        key={item.id}
      >
        <Box
          p={padding}
          onClick={() => {
            globalThis.open(
              `https://database.turtlecraft.gg/?item=${item.id}`,
            )
          }}
        >
          <Image
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
        </Box>
        <Box flex={1} py={padding}>
          <Title
            order={6}
            flex={1}
            {...handlers()}
            className={`q${item.quality}`}
            lineClamp={1}
          >
            {item.name}
          </Title>
        </Box>
        <Flex
          {...handlers()}
          px={padding}
          pr={padding}
        >
          {rightSection}
        </Flex>
      </Flex>
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
  onClick,
  onLongClick,
  selectedItemIds,
  showTooltipItemId,
  user,
  attendees,
  deleteMode,
  selectMode,
  style,
}: {
  onClick?: () => void
  onLongClick?: () => void
  selectedItemIds?: number[]
  showTooltipItemId?: number
  item: Item
  user?: User
  attendees?: Attendee[]
  deleteMode?: boolean
  selectMode?: boolean
  style?: React.CSSProperties
}) => {
  const highlight = showTooltipItemId == item.id ||
    (selectedItemIds || []).includes(item.id)

  return (
    <Box style={style}>
      <ItemNameAndIcon
        item={item}
        showTooltipItemId={showTooltipItemId}
        highlight={highlight}
        onClick={onClick}
        onLongClick={onLongClick}
        rightSection={
          <Group wrap="nowrap">
            {attendees && user
              ? (
                <ReservedByOthers
                  itemId={item.id}
                  user={user}
                  attendees={attendees}
                />
              )
              : null}
            {deleteMode ? <CloseButton /> : null}
            {selectMode
              ? (
                <Checkbox
                  checked={selectedItemIds?.includes(item.id)}
                  size="md"
                />
              )
              : null}
          </Group>
        }
      />
    </Box>
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
  selectMode = false,
  items,
  attendees,
}: RowComponentProps<{
  onItemClick: (item_id: number) => void
  onItemLongClick: (item_id: number) => void
  selectedItemIds?: number[]
  user?: User
  showTooltipItemId?: number
  deleteMode?: boolean
  selectMode?: boolean
  items: Item[]
  attendees?: Attendee[]
}>) => {
  return (
    <SelectableItem
      item={items[index]}
      selectedItemIds={selectedItemIds}
      onClick={() => onItemClick(items[index].id)}
      onLongClick={() => onItemLongClick(items[index].id)}
      showTooltipItemId={showTooltipItemId}
      user={user}
      deleteMode={deleteMode}
      selectMode={selectMode}
      style={style}
      attendees={attendees}
    />
  )
}
