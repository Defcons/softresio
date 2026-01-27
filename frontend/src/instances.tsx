import type { SelectProps } from "@mantine/core"
import { Title } from "@mantine/core"
import type { Instance } from "../types/types.ts"

export const instanceOrder = [
  "Zul'Gurub",
  "Ruins of Ahn'Qiraj",
  "Molten Core",
  "Onyxia's Lair",
  "Lower Karazhan Halls",
  "Blackwing Lair",
  "Emerald Sanctum",
  "Temple of Ahn'Qiraj",
  "Naxxramas",
  "Tower of Karazhan",
]

export const renderInstance: (
  instances: Instance[],
) => SelectProps["renderOption"] = (instances) =>
(
  { option },
) => {
  const instance = instances.filter((i) => i.id.toString() == option.value)[0]
  return (
    <>
      <Title order={6} w={40}>{instance.shortname.toUpperCase()}</Title>
      {instance.name}
    </>
  )
}
