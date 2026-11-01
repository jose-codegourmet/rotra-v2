import { describe, expect, it, vi } from 'vitest'
import { connectBatchLifecycle } from './lifecycle'

it('flushes only on hidden visibility, pagehide and cleanup, then removes listeners', () => {
  const page = new EventTarget()
  const visibility = Object.assign(new EventTarget(), { hidden: false })
  const flush = vi.fn(async () => {})
  const disconnect = connectBatchLifecycle(
    { flush, pendingKeys: () => new Set() },
    page,
    visibility,
  )
  visibility.dispatchEvent(new Event('visibilitychange'))
  expect(flush).not.toHaveBeenCalled()
  visibility.hidden = true
  visibility.dispatchEvent(new Event('visibilitychange'))
  page.dispatchEvent(new Event('pagehide'))
  expect(flush).toHaveBeenCalledTimes(2)
  disconnect()
  expect(flush).toHaveBeenCalledTimes(3)
  page.dispatchEvent(new Event('pagehide'))
  visibility.dispatchEvent(new Event('visibilitychange'))
  expect(flush).toHaveBeenCalledTimes(3)
})
describe('browser leave guard', () => {
  it.each([true, false])('flushes before checking for unsaved intent (pending=%s)', (pending) => {
    const page = new EventTarget()
    const visibility = Object.assign(new EventTarget(), { hidden: false })
    const calls: string[] = []
    const disconnect = connectBatchLifecycle(
      {
        flush: async () => {
          calls.push('flush')
        },
        pendingKeys: () => {
          calls.push('pending')
          return new Set(pending ? ['a'] : [])
        },
      },
      page,
      visibility,
    )
    const event = new Event('beforeunload', { cancelable: true })
    Object.defineProperty(event, 'returnValue', { value: '', writable: true })
    page.dispatchEvent(event)
    expect(calls).toEqual(['flush', 'pending'])
    expect(event.defaultPrevented).toBe(pending)
    disconnect()
  })
})
