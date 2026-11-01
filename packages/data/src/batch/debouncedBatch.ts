export type BatchChange<Key, Value> = { key: Key; value: Value }
type Entry<Value> = { base: Value; value: Value; revision: number; at: number }

/** Transient intent, separate from accepted query data. Requests are serialized, never toggles. */
export function createDebouncedBatch<Key, Value>(options: {
  delayMs: number
  send: (changes: BatchChange<Key, Value>[]) => Promise<unknown>
  onRollback?: (error: unknown, changes: BatchChange<Key, Value>[]) => void
}) {
  const entries = new Map<Key, Entry<Value>>()
  const listeners = new Set<() => void>()
  let inFlight = new Map<Key, Entry<Value>>()
  let revision = 0
  let version = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let running: Promise<void> | null = null
  const emit = () => {
    version++
    for (const listener of listeners) listener()
  }
  const pendingKeys = () => new Set([...inFlight.keys(), ...entries.keys()])
  const clearTimer = () => {
    clearTimeout(timer)
    timer = undefined
  }
  function flush(): Promise<void> {
    clearTimer()
    if (running) return running.then(flush)
    const batch = new Map([...entries].filter(([, e]) => !Object.is(e.value, e.base)))
    if (!batch.size) return Promise.resolve()
    const changes = [...batch].map(([key, entry]) => ({ key, value: entry.value }))
    inFlight = batch
    // Assign before notifying subscribers, so a reentrant flush shares this request.
    running = Promise.resolve()
      .then(() => options.send(changes))
      .then(
        () => {
          for (const [key, sent] of batch) {
            const current = entries.get(key)
            if (!current) continue
            if (Object.is(current.value, sent.value)) entries.delete(key)
            else entries.set(key, { ...current, base: sent.value })
          }
        },
        (error: unknown) => {
          for (const [key, sent] of batch) {
            const current = entries.get(key)
            if (
              current &&
              (current.revision === sent.revision || Object.is(current.value, current.base))
            )
              entries.delete(key)
          }
          options.onRollback?.(error, changes)
        },
      )
      .finally(() => {
        inFlight = new Map()
        running = null
        emit()
      })
    emit()
    return running
  }
  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => version,
    pendingKeys,
    value: (key: Key, serverValue: Value) => {
      const entry = entries.get(key)
      return entry ? entry.value : serverValue
    },
    changedAt: (key: Key) => entries.get(key)?.at,
    set(key: Key, value: Value, serverValue: Value) {
      const previous = entries.get(key)
      const base = previous ? previous.base : serverValue
      if (!inFlight.has(key) && Object.is(value, base)) entries.delete(key)
      else entries.set(key, { base, value, revision: ++revision, at: Date.now() })
      clearTimer()
      if (entries.size)
        timer = setTimeout(() => {
          void flush()
        }, options.delayMs)
      emit()
    },
    flush,
  }
}
export type DebouncedBatch<Key, Value> = ReturnType<typeof createDebouncedBatch<Key, Value>>
