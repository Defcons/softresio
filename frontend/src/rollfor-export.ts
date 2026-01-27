import type { Sheet } from "../types/types.ts"

export const rollForExport = (sheet: Sheet) => (globalThis.btoa(JSON.stringify({
  metadata: {
    id: sheet.raidId,
    origin: globalThis.location.hostname,
  },
  softreserves: sheet.attendees.map((attendee) => ({
    name: attendee.character.name,
    items: attendee.softReserves.map((sr) => ({
      id: sr.itemId,
      sr_plus: sr.srPlus || undefined,
    })),
  })),
  hardreserves: sheet.hardReserves.map((id) => ({
    id,
  })),
})))
