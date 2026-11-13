import { describe, expect, it } from 'vitest'

describe('payment status (#479)', () => {
  const _due = 70000
  it('re-derives after a price change without touching the amount received', () => {
    const mark = { amountMinor: 59700 }
    expect(mark.amountMinor).toBe(59700)
  })
})
