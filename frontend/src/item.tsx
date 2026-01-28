import type { ReactElement } from "react"
import { useHover } from "@mantine/hooks"
import { LongPressCallbackReason, useLongPress } from "use-long-press"
import type { Attendee, Item, User } from "../types/types.ts"
import { type RowComponentProps } from "react-window"
import {
  ActionIcon,
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
  {
    item,
    showTooltipItemId,
    highlight,
    onClick,
    onLongClick,
    rightSection,
    onRightSectionClick,
    allowImageClick = true,
  }: {
    item: Item
    showTooltipItemId?: number
    highlight: boolean
    allowImageClick?: boolean
    onClick?: () => void
    onLongClick?: () => void
    rightSection?: ReactElement
    onRightSectionClick?: () => void
    onMiddleRightSectionClick?: () => void
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
        className={`list-element ${
          highlight || (hovered && !isTouchScreen)
            ? "list-element-highlight"
            : ""
        }`}
      >
        <Box
          p={padding}
          onClick={() => {
            if (allowImageClick) {
              globalThis.open(
                `https://database.turtlecraft.gg/?item=${item.id}`,
              )
            }
          }}
        >
          {(item.id == 0)
            ? (
              <Box h={24} w={24}>
              </Box>
            )
            : (
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
            )}
        </Box>
        <Box flex={1} p={padding} {...handlers()}>
          <Title
            fs={(item.id == 0) ? "italic" : undefined}
            fw={(item.id == 0) ? 200 : undefined}
            order={6}
            flex={1}
            className={`q${item.quality}`}
            lineClamp={1}
          >
            {item.name}
          </Title>
        </Box>
        <Flex
          onClick={onRightSectionClick}
          px={padding}
          align="center"
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
  onRightSectionClick,
  selectedItemIds,
  showTooltipItemId,
  user,
  attendees,
  deleteMode,
  sameItemLimit = 0,
  selectMode,
  style,
  hardReserves = [],
}: {
  onClick?: () => void
  onLongClick?: () => void
  onRightSectionClick?: () => void
  selectedItemIds?: number[]
  showTooltipItemId?: number
  item: Item
  user?: User
  attendees?: Attendee[]
  deleteMode?: boolean
  selectMode?: boolean
  style?: React.CSSProperties
  hardReserves?: number[]
  sameItemLimit?: number
}) => {
  const highlight = showTooltipItemId == item.id ||
    (selectedItemIds || []).includes(item.id)
  const itemCount = selectedItemIds?.filter((id) => item.id == id).length || 0

  return (
    <Box style={style}>
      <ItemNameAndIcon
        item={item}
        showTooltipItemId={showTooltipItemId}
        highlight={highlight}
        onClick={onClick}
        onLongClick={onLongClick}
        onRightSectionClick={onRightSectionClick}
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
            {hardReserves.includes(item.id)
              ? <Badge color="red">HR</Badge>
              : null}
            {deleteMode ? <CloseButton /> : null}
            {(selectMode && !hardReserves.includes(item.id) &&
                sameItemLimit > 1 && itemCount > 0)
              ? (
                <ActionIcon size={25}>
                  <Title order={6}>{itemCount}</Title>
                </ActionIcon>
              )
              : null}
            {(selectMode && !hardReserves.includes(item.id) &&
                (sameItemLimit === 1 || itemCount == 0))
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
  onClick,
  onLongClick,
  onRightSectionClick,
  showTooltipItemId,
  user,
  style,
  deleteMode = false,
  selectMode = false,
  items,
  attendees,
  hardReserves = [],
  sameItemLimit,
}: RowComponentProps<{
  onClick: (item_id: number) => void
  onLongClick: (item_id: number) => void
  onRightSectionClick: (item_id: number) => void
  selectedItemIds?: number[]
  user?: User
  showTooltipItemId?: number
  deleteMode?: boolean
  selectMode?: boolean
  items: Item[]
  attendees?: Attendee[]
  hardReserves?: number[]
  sameItemLimit: number
}>) => {
  return (
    <SelectableItem
      item={items[index]}
      selectedItemIds={selectedItemIds}
      onClick={() => onClick(items[index].id)}
      onLongClick={() => onLongClick(items[index].id)}
      onRightSectionClick={() => onRightSectionClick(items[index].id)}
      showTooltipItemId={showTooltipItemId}
      user={user}
      deleteMode={deleteMode}
      selectMode={selectMode}
      style={style}
      attendees={attendees}
      hardReserves={hardReserves}
      sameItemLimit={sameItemLimit}
    />
  )
}
