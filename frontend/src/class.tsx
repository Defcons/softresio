import type { Character, CharacterWithId } from "../shared/types.ts"
import { CheckIcon, Group, Image, Title, Tooltip } from "@mantine/core"
import { IconCheck } from "@tabler/icons-react"
import type { AutocompleteProps, SelectProps } from "@mantine/core"

export const CharacterNameClassSpec = (
  { character }: { character: Character },
) => (
  <Tooltip label={`${character.name} (${character.spec} ${character.class})`}>
    <Group wrap="nowrap" gap={0}>
      <ClassIcon xclass={character.class} />
      <ClassIcon xclass={character.class} spec={character.spec} />
      <Title order={6} lineClamp={1} ml="sm">
        {character.name}
      </Title>
    </Group>
  </Tooltip>
)

export const renderClassSpec: (
  myCharacters: CharacterWithId[],
) => AutocompleteProps["renderOption"] = (myCharacters) =>
(
  { option },
) => {
  const choice = myCharacters.filter((e) => e.id == option.value)[0]
  return (
    <Group gap="xs" w="100%" wrap="nowrap">
      <Group gap={2} wrap="nowrap">
        <ClassIcon xclass={choice.character.class} />
        <ClassIcon
          xclass={choice.character.class}
          spec={choice.character.spec}
        />
      </Group>
      {choice.character.name}
    </Group>
  )
}

export const renderClass: (
  selectedClass?: string,
) => SelectProps["renderOption"] = (selectedClass) =>
(
  { option },
) => (
  <Group gap="xs" w="100%" wrap="nowrap">
    <ClassIcon xclass={option.value} />
    {option.label}
    <Group justify="right" w="100%">
      {selectedClass == option.value ? <IconCheck /> : null}
    </Group>
  </Group>
)

export const renderSpec: (
  selectedClass: string,
  selectedSpec?: string | null,
) => SelectProps["renderOption"] = (selectedClass, selectedSpec) =>
(
  { option },
) => (selectedClass
  ? (
    <Group gap="xs" w="100%" wrap="nowrap">
      <ClassIcon xclass={selectedClass} spec={option.value || null} />
      {option.label}
      <Group justify="right" w="100%">
        {selectedSpec == option.value ? <CheckIcon height={10} /> : null}
      </Group>
    </Group>
  )
  : null)

export const ClassIcon = (
  { spec, xclass }: { xclass?: string | null; spec?: string | null },
) => {
  const icon = !xclass || spec === null
    ? "inv_misc_questionmark.png"
    : classIcons[`${xclass}${spec ? spec.replace(" ", "") : ""}`]
  return (
    <Image
      radius={2}
      h={20}
      w={20}
      src={`https://database.turtlecraft.gg/images/icons/medium/${icon}`}
    />
  )
}

export const classes: { [className: string]: string[] } = {
  "Warrior": [
    "Arms",
    "Fury",
    "Protection",
  ],
  "Priest": [
    "Discipline",
    "Holy",
    "Shadow",
  ],
  "Mage": [
    "Arcane",
    "Fire",
    "Frost",
  ],
  "Rogue": [
    "Assassination",
    "Combat",
    "Subtlety",
  ],
  "Druid": [
    "Balance",
    "Feral Combat",
    "Restoration",
  ],
  "Paladin": [
    "Holy",
    "Protection",
    "Retribution",
  ],
  "Shaman": [
    "Elemental",
    "Enhancement",
    "Restoration",
  ],
  "Warlock": [
    "Affliction",
    "Demonology",
    "Destruction",
  ],
  "Hunter": [
    "Beast Mastery",
    "Marksmanship",
    "Survival",
  ],
}

export const classIcons: { [classSpec: string]: string } = {
  "Warrior": "class_warrior.png",
  "WarriorArms": "ability_rogue_eviscerate.png",
  "WarriorFury": "ability_warrior_innerrage.png",
  "WarriorProtection": "inv_shield_06.png",
  "Paladin": "class_paladin.png",
  "PaladinHoly": "spell_holy_holybolt.png",
  "PaladinProtection": "spell_holy_devotionaura.png",
  "PaladinRetribution": "spell_holy_auraoflight.png",
  "Hunter": "class_hunter.png",
  "HunterBeastMastery": "ability_hunter_beasttaming.png",
  "HunterMarksmanship": "ability_marksmanship.png",
  "HunterSurvival": "ability_hunter_swiftstrike.png",
  "Rogue": "class_rogue.png",
  "RogueAssassination": "ability_rogue_eviscerate.png",
  "RogueCombat": "ability_backstab.png",
  "RogueSubtlety": "ability_stealth.png",
  "Priest": "class_priest.png",
  "PriestDiscipline": "spell_holy_wordfortitude.png",
  "PriestHoly": "spell_holy_holybolt.png",
  "PriestShadow": "spell_shadow_shadowwordpain.png",
  "Shaman": "class_shaman.png",
  "ShamanElemental": "spell_nature_lightning.png",
  "ShamanEnhancement": "spell_nature_lightningshield.png",
  "ShamanRestoration": "spell_nature_magicimmunity.png",
  "Mage": "class_mage.png",
  "MageArcane": "spell_holy_magicalsentry.png",
  "MageFire": "spell_fire_flamebolt.png",
  "MageFrost": "spell_frost_frostbolt02.png",
  "Warlock": "class_warlock.png",
  "WarlockAffliction": "spell_shadow_deathcoil.png",
  "WarlockDemonology": "spell_shadow_metamorphosis.png",
  "WarlockDestruction": "spell_shadow_rainoffire.png",
  "Druid": "class_druid.png",
  "DruidBalance": "spell_nature_starfall.png",
  "DruidFeralCombat": "ability_racial_bearform.png",
  "DruidRestoration": "spell_nature_healingtouch.png",
}
