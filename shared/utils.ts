type RemoveOneType = <T>(filter: (e: T) => boolean, list: T[]) => T[]

export const removeOne: RemoveOneType = (filter, list) => {
  const match = list.find((e) => filter(e))
  if (!match) return list
  const idx = list.indexOf(match)
  return [...list.slice(0, idx), ...list.slice(idx + 1)]
}

export const formatTime = (time: string) =>
  Intl.DateTimeFormat(navigator.language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(time))

export const diff = (before: number[], after: number[]) => {
  let added = [...after]
  let removed = [...before]

  for (const element of before) {
    if (added.includes(element)) {
      added = removeOne((e) => e == element, added)
    }
  }
  for (const element of after) {
    if (removed.includes(element)) {
      removed = removeOne((e) => e == element, removed)
    }
  }
  return { added, removed }
}
