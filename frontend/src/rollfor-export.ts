import type { Raid } from "../shared/types.ts"

export const rollForExport = (raid: Raid) => (globalThis.btoa(JSON.stringify({
  metadata: {
    id: raid.id,
    origin: globalThis.location.hostname,
  },
  softreserves: raid.attendees.map((attendee) => ({
    name: attendee.character.name,
    items: attendee.softReserves.map((sr) => ({
      id: sr.itemId,
      sr_plus: sr.srPlus || undefined,
    })),
  })),
  hardreserves: raid.hardReserves.map((id) => ({
    id,
  })),
})))
