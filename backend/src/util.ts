export function choice<T>(array: readonly T[]): T {
  // Return a random element
  return array[Math.floor(Math.random() * array.length)]
}

export function sample<T>(array: readonly T[], k: number): T[] {
  // Return a k length array of unique elements
  // Partial Fisher-Yates shuffle (which I implemented myself)
  const result = [...array]
  const n = result.length
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(Math.random() * (n - i))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result.slice(0, k)
}

export function randint(min: number, max: number): number {
  // Return a random integer between two values, inclusive
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#getting_a_random_integer_between_two_values_inclusive
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1) + min)
}
