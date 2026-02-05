import type { ComboboxItem, OptionsFilter, SelectProps } from "@mantine/core"
import { Title } from "@mantine/core"
import type { Instance } from "../shared/types.ts"

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

export const instanceFilter: (instances: Instance[]) => OptionsFilter =
  (instances) => ({ options, search }) => {
    return (options as ComboboxItem[]).filter((option) => {
      const instance = instances.find((instance) =>
        instance.id == Number(option.value)
      )
      return instance?.name.toLowerCase().includes(search.toLowerCase()) ||
        instance?.shortname.toLowerCase().includes(search.toLowerCase())
    })
  }
