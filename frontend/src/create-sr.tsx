import { useEffect, useState } from "react"
import type {
  Attendee,
  Character,
  CharacterWithId,
  Class,
  CreateSrRequest,
  CreateSrResponse,
  GetCharactersResponse,
  Instance,
  Raid,
  User,
} from "../shared/types.ts"
import {
  Autocomplete,
  Button,
  Group,
  Paper,
  Select,
  Stack,
  Text,
} from "@mantine/core"
import { classes } from "./class.tsx"
import "../css/tooltip.css"
import { ItemSelect } from "./item-select.tsx"
import {
  ClassIcon,
  renderClass,
  renderClassSpec,
  renderSpec,
} from "./class.tsx"
import { deepEqual } from "fast-equals"
import { modals } from "@mantine/modals"

export const CreateSr = (
  { instance, raid, loadRaid, user, itemPickerOpen }: {
    instance: Instance
    raid: Raid
    loadRaid: (raid?: Raid) => void
    user: User
    itemPickerOpen: boolean
  },
) => {
  const [selectedClass, setSelectedClass] = useState<Class | null>()
  const [selectedSpec, setSelectedSpec] = useState<string | null>()
  const [characterName, setCharacterName] = useState("")
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([])
  const [myCharacters, setMyCharacters] = useState<CharacterWithId[]>([])

  const srCounter = new Map()
  for (const attendee of raid.attendees) {
    for (const sr of attendee.softReserves) {
      srCounter.set(sr.itemId, (srCounter.get(sr.itemId) || 0) + 1)
    }
  }

  const submitSr = () => {
    if (
      selectedClass == undefined || selectedSpec == undefined ||
      characterName == undefined
    ) {
      return
    }
    const character: Character = {
      name: characterName,
      class: selectedClass,
      spec: selectedSpec,
    }
    const request: CreateSrRequest = {
      raidId: raid.id,
      character,
      selectedItemIds: (selectedItemIds.length == 0) ? [0] : selectedItemIds,
    }
    fetch("/api/sr/create", { method: "POST", body: JSON.stringify(request) })
      .then((r) => r.json())
      .then((j: CreateSrResponse) => {
        if (j.error) {
          alert(j.error)
        } else if (j.data) {
          loadRaid(j.data)
        }
      })
  }

  const findAttendeeMe = (): Attendee | undefined =>
    raid.attendees.filter((attendee) => attendee.user.userId === user.userId)[0]

  const srChanged = () => {
    const attendeeMe = findAttendeeMe()
    if (!attendeeMe) return true
    const a = {
      class: attendeeMe.character.class,
      spec: attendeeMe.character.spec,
      name: attendeeMe.character.name,
      softReserves: attendeeMe.softReserves.filter((sr) => sr.itemId != 0).map((
        softReserve,
      ) => softReserve.itemId).sort(),
    }
    const b = {
      class: selectedClass,
      spec: selectedSpec,
      name: characterName,
      softReserves: selectedItemIds.sort(),
    }
    return !deepEqual(a, b)
  }

  useEffect(() => {
    fetch(`/api/characters`).then((r) => r.json()).then(
      (j: GetCharactersResponse) => {
        if (j.error) {
          alert(j.error)
        } else if (j.data) {
          setMyCharacters(
            j.data.map((character) => ({ character, id: crypto.randomUUID() })),
          )
        }
      },
    )

    const attendeeMe = findAttendeeMe()
    setSelectedClass(attendeeMe?.character.class)
    setSelectedSpec(attendeeMe?.character.spec)
    setCharacterName(attendeeMe?.character.name || "")
    setSelectedItemIds(
      attendeeMe?.softReserves.filter((sr) => sr.itemId != 0).map((sr) =>
        sr.itemId
      ) || [],
    )
  }, [user])

  const openConfirmSrsModal = () =>
    modals.openConfirmModal({
      title: "Are you sure?",
      centered: true,
      children: (
        <Text size="sm">
          You are allowed to reserve {raid.srCount}{" "}
          item{raid.srCount == 1 ? "" : "s"}, but you{" "}
          {selectedItemIds.length == 0
            ? "haven't reserved any."
            : `have only reserved ${selectedItemIds.length}.`}
        </Text>
      ),
      labels: { confirm: "Confirm", cancel: "Cancel" },
      onCancel: () => console.log("Cancel"),
      onConfirm: submitSr,
    })

  return (
    <Paper shadow="sm" p="sm">
      <Stack>
        <Autocomplete
          withAsterisk={!characterName}
          value={characterName}
          onChange={(value) => {
            setCharacterName(value)
          }}
          onOptionSubmit={(value) => {
            const choice = myCharacters.filter((c) => c.id == value)[0]
            setSelectedSpec(choice.character.spec)
            setSelectedClass(choice.character.class)
            setCharacterName(choice.character.name)
          }}
          renderOption={renderClassSpec(myCharacters)}
          w="200"
          maxLength={12}
          label="Character name"
          placeholder="Character name"
          data={myCharacters.map((e) => ({
            label: e.character.name,
            value: e.id,
          }))}
        />
        <Group wrap="nowrap">
          <Select
            placeholder="Class"
            searchable
            withAsterisk={!selectedClass}
            value={selectedClass}
            onChange={(value) => {
              setSelectedSpec(null)
              setSelectedClass(value as Class)
            }}
            data={Object.keys(classes)}
            label="Class"
            renderOption={renderClass(selectedClass || undefined)}
            leftSection={<ClassIcon xclass={selectedClass} />}
            leftSectionPointerEvents="none"
          />
          <Select
            placeholder="Specialization"
            withAsterisk={!selectedSpec}
            disabled={!selectedClass}
            onChange={setSelectedSpec}
            value={selectedSpec}
            data={selectedClass ? classes[selectedClass] : []}
            renderOption={selectedClass
              ? renderSpec(selectedClass, selectedSpec)
              : undefined}
            leftSection={
              <ClassIcon xclass={selectedClass} spec={selectedSpec} />
            }
            leftSectionPointerEvents="none"
            label="Specialization"
          />
        </Group>
        <ItemSelect
          withAsterisk={false}
          label="Items"
          value={selectedItemIds}
          onChange={setSelectedItemIds}
          instance={instance}
          selectedClass={selectedClass}
          user={user}
          attendees={raid.attendees}
          itemLimit={raid.srCount}
          hardReserves={raid.hardReserves}
          sameItemLimit={raid.allowDuplicateSr ? raid.srCount : 1}
          itemPickerOpen={itemPickerOpen}
        />
        <Button
          disabled={raid.locked || !selectedClass || !selectedSpec ||
            !characterName ||
            (selectedItemIds && (selectedItemIds.length > raid.srCount)) ||
            !srChanged()}
          onClick={(selectedItemIds.length < raid.srCount)
            ? openConfirmSrsModal
            : submitSr}
        >
          {raid.locked ? "Raid is locked" : "Submit"}
        </Button>
      </Stack>
    </Paper>
  )
}
