// A raid has at most this many attendees (a raid group is 40).
export const MAX_ATTENDEES = 100

type RaidShape = {
  srCount: number
  attendees: { character: { name: string }; user: { userId: string } }[]
}

// Why a reservation from `userId` for `characterName` with `itemCount` items
// must be refused in this raid, or null when it may go ahead.
export const srRefusal = (
  raid: RaidShape,
  userId: string,
  characterName: string,
  itemCount: number,
): { status: 400 | 403; message: string } | null => {
  if (itemCount > raid.srCount) {
    return { status: 400, message: "Too many items selected" }
  }
  // A character name belongs to whoever reserved with it first.
  const takenBy = raid.attendees.find((a) => a.character.name == characterName)
  if (takenBy && takenBy.user.userId != userId) {
    return {
      status: 403,
      message: "That character name is taken by someone else",
    }
  }
  // This reservation replaces the user's own entries (same name, or any name).
  const others = raid.attendees.filter((a) =>
    a.character.name !== characterName && a.user.userId !== userId
  )
  if (others.length >= MAX_ATTENDEES) {
    return { status: 400, message: "This raid is full" }
  }
  return null
}
