import { Button, CopyButton } from "@mantine/core"

export const CopyRaidLink = ({ raidId }: { raidId: string }) => (
  <CopyButton
    value={`${window.location.protocol}//${window.location.hostname}${
      window.location.hostname == "localhost" ? `:${window.location.port}` : ""
    }/${raidId}`}
  >
    {({ copied, copy }) => (
      <Button variant={"default"} onClick={copy}>
        {copied ? "yoink" : "Copy link"}
      </Button>
    )}
  </CopyButton>
)
