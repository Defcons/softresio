// Small in-memory helpers. Each server worker (`deno serve --parallel`) keeps its own copy, so a limit here is per
// worker: keep the numbers generous.

// At most `limit` calls per key in each `windowMs`.
export class RateLimiter {
  #hits = new Map<string, { count: number; reset: number }>()

  constructor(
    readonly limit: number,
    readonly windowMs: number,
    readonly maxKeys = 10000,
  ) {}

  // True when this call is within the limit (and counts it).
  allow(key: string, now = Date.now()): boolean {
    const hit = this.#hits.get(key)
    if (!hit || hit.reset <= now) {
      if (this.#hits.size >= this.maxKeys) this.#sweep(now)
      this.#hits.set(key, { count: 1, reset: now + this.windowMs })
      return true
    }
    if (hit.count >= this.limit) return false
    hit.count++
    return true
  }

  #sweep(now: number) {
    for (const [key, hit] of this.#hits) {
      if (hit.reset <= now) this.#hits.delete(key)
    }
    if (this.#hits.size >= this.maxKeys) this.#hits.clear()
  }
}

// Values kept for `ttlMs`, at most `maxEntries` of them (the oldest go first).
export class TtlCache<V> {
  #entries = new Map<string, { value: V; expires: number }>()

  constructor(readonly ttlMs: number, readonly maxEntries: number) {}

  get(key: string, now = Date.now()): V | undefined {
    const entry = this.#entries.get(key)
    if (!entry) return undefined
    if (entry.expires <= now) {
      this.#entries.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: V, now = Date.now()) {
    this.#entries.delete(key)
    while (this.#entries.size >= this.maxEntries) {
      this.#entries.delete(this.#entries.keys().next().value as string)
    }
    this.#entries.set(key, { value, expires: now + this.ttlMs })
  }

  clear() {
    this.#entries.clear()
  }
}
