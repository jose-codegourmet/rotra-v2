import { queueColumnsFor } from '@rotra/ui/upcoming-queue-row'
import { describe, expect, it } from 'vitest'
import { snakePlacement } from './QueueGrid'

describe('queueColumnsFor', () => {
  it('fits 220 px tiles with 10 px gaps and has no upper limit', () => {
    expect(queueColumnsFor(0)).toBe(1)
    expect(queueColumnsFor(343)).toBe(1)
    expect(queueColumnsFor(470)).toBe(2)
    expect(queueColumnsFor(894)).toBe(3)
    expect(queueColumnsFor(1218)).toBe(5)
    expect(queueColumnsFor(1800)).toBe(7)
  })
})

describe('snakePlacement', () => {
  it('runs left to right, then right to left, with any column count', () => {
    const cols = 7
    const order = Array.from({ length: 10 }, (_, i) => snakePlacement(i, 10, cols))
    expect(order.slice(0, 7).map((p) => p.col)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(order[6]?.flow).toBe('down')
    expect(order.slice(7).map((p) => [p.row, p.col])).toEqual([
      [1, 6],
      [1, 5],
      [1, 4],
    ])
    expect(order[7]?.flow).toBe('left')
    expect(order[9]?.flow).toBeNull()
  })
})
