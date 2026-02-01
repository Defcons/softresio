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
  const added = before.reduce((acc, cur) => removeOne((e) => e == cur, acc), [
    ...after,
  ])
  const removed = after.reduce((acc, cur) => removeOne((e) => e == cur, acc), [
    ...before,
  ])
  return { added, removed }
}
