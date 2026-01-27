import { Button, CopyButton, Tooltip } from "@mantine/core"
import type { ReactElement } from "react"
import { IconCopy } from "@tabler/icons-react"

export const raidIdToUrl = (raidId: string): string => {
  const { protocol, hostname, port } = globalThis.location
  return `${protocol}//${hostname}${
    hostname == "localhost" ? `:${port}` : ""
  }/${raidId}`
}

export const CopyClipboardButton = (
  { w, label, tooltip, orange, onClick, toClipboard, icon }: {
    w?: string
    label: string
    tooltip: string
    orange?: boolean
    toClipboard: string
    onClick?: () => void
    icon?: ReactElement
  },
) => (
  <CopyButton timeout={1000} value={toClipboard}>
    {({ copied, copy }) => (
      <Tooltip
        label={copied ? "Copied!" : tooltip}
        withArrow
        position="top"
      >
        <Button
          onClick={() => {
            onClick?.()
            copy()
          }}
          variant={orange ? "" : "default"}
          w={w}
          leftSection={icon || <IconCopy size={16} />}
        >
          {label}
        </Button>
      </Tooltip>
    )}
  </CopyButton>
)
