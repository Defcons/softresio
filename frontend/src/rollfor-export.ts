import type { Raid } from "../shared/types.ts"
import { Base64 } from "js-base64"

export const rollForExport = (raid: Raid) => (Base64.encode(JSON.stringify({
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
