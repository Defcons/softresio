import type { Raid, SrPlus } from "../shared/types.ts"
import { sumSrPlus } from "../shared/utils.ts"
import { Base64 } from "js-base64"

export const rollForExport = (
  raid: Raid,
  srPluses?: SrPlus[],
) => (Base64.encode(JSON.stringify({
  metadata: {
    id: raid.id,
    origin: globalThis.location.hostname,
  },
  softreserves: raid.attendees.map((attendee) => ({
    name: attendee.character.name,
    items: attendee.softReserves.map((sr) => ({
      id: sr.itemId,
      sr_plus: srPluses
        ? sumSrPlus(
          srPluses?.filter((srPlus) =>
            srPlus.characterName == attendee.character.name &&
            srPlus.itemId == sr.itemId
          ),
        )
        : undefined,
    })),
  })),
  hardreserves: raid.hardReserves.map((id) => ({
    id,
  })),
})))
