import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDebouncedBatch } from './debouncedBatch'

function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('desired-state debounce controller', () => {
  it('updates immediately and coalesces five players 800 ms after the last tap', async () => {
    const send = vi.fn(async () => {})
    const batch = createDebouncedBatch<string, boolean>({ delayMs: 800, send })
    for (const key of ['a', 'b', 'c', 'd', 'e']) {
      batch.set(key, true, false)
      expect(batch.value(key, false)).toBe(true)
      await vi.advanceTimersByTimeAsync(100)
    }
    expect(send).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(699)
    expect(send).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(send).toHaveBeenCalledExactlyOnceWith(
      ['a', 'b', 'c', 'd', 'e'].map((key) => ({ key, value: true })),
    )
    expect(batch.pendingKeys().size).toBe(0)
  })
  it('drops on/off and off/on reversals without sending anything', async () => {
    const send = vi.fn(async () => {})
    const batch = createDebouncedBatch<string, boolean>({ delayMs: 800, send })
    batch.set('a', true, false)
    batch.set('a', false, false)
    batch.set('b', false, true)
    batch.set('b', true, true)
    await vi.advanceTimersByTimeAsync(1000)
    await batch.flush()
    expect(send).not.toHaveBeenCalled()
    expect(batch.pendingKeys().size).toBe(0)
  })
  it('flushes before the timer, with no duplicate when the old timer elapses', async () => {
    const send = vi.fn(async () => {})
    const batch = createDebouncedBatch<string, boolean>({ delayMs: 800, send })
    batch.set('a', true, false)
    await batch.flush()
    await vi.advanceTimersByTimeAsync(1000)
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('keeps the overlay through stale refetches and serializes compensation after a save', async () => {
    const first = deferred()
    const send = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValue(undefined)
    const batch = createDebouncedBatch<string, boolean>({ delayMs: 800, send })
    batch.set('a', true, false)
    const saving = batch.flush()
    await Promise.resolve()
    expect(batch.value('a', false)).toBe(true)
    batch.set('a', false, false)
    const drain = batch.flush()
    expect(send).toHaveBeenCalledTimes(1)
    first.resolve()
    await saving
    await drain
    expect(send.mock.calls).toEqual([[[{ key: 'a', value: true }]], [[{ key: 'a', value: false }]]])
    expect(batch.pendingKeys().size).toBe(0)
  })
  it('rolls back only failed revisions, retaining later taps on the same and other players', async () => {
    const first = deferred()
    const rollback = vi.fn()
    const send = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValue(undefined)
    const batch = createDebouncedBatch<string, boolean>({
      delayMs: 800,
      send,
      onRollback: rollback,
    })
    batch.set('a', true, false)
    batch.set('b', true, false)
    const saving = batch.flush()
    await Promise.resolve()
    batch.set('a', false, false)
    batch.set('a', true, false)
    batch.set('c', true, false)
    first.reject(new Error('Save failed'))
    await saving
    expect(batch.value('b', false)).toBe(false)
    expect(batch.value('a', false)).toBe(true)
    expect(batch.value('c', false)).toBe(true)
    expect([...batch.pendingKeys()]).toEqual(['a', 'c'])
    expect(rollback).toHaveBeenCalledTimes(1)
    await batch.flush()
    expect(send.mock.calls[1]).toEqual([
      [
        { key: 'a', value: true },
        { key: 'c', value: true },
      ],
    ])
  })
  it('does not retry a newer intent already equal to the accepted state after failure', async () => {
    const first = deferred()
    const send = vi.fn(() => first.promise)
    const batch = createDebouncedBatch<string, boolean>({ delayMs: 800, send })
    batch.set('a', true, false)
    const saving = batch.flush()
    await Promise.resolve()
    batch.set('a', false, false)
    first.reject(new Error('offline'))
    await saving
    await batch.flush()
    expect(batch.pendingKeys().size).toBe(0)
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('supports nullable generic values and synchronous subscriptions', async () => {
    const send = vi.fn(async () => {})
    const batch = createDebouncedBatch<string, string | null>({ delayMs: 800, send })
    const changed = vi.fn()
    const off = batch.subscribe(changed)
    batch.set('a', null, 'accepted')
    expect(batch.value('a', 'accepted')).toBeNull()
    expect(changed).toHaveBeenCalledTimes(1)
    off()
    await batch.flush()
    expect(changed).toHaveBeenCalledTimes(1)
  })
})
