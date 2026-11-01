import { describe, expect, it } from 'vitest'
import { managementPlayer } from '../fixtures/adminPlayerManagement'
import {
  adminPlayerStats,
  duplicateGroups,
  levelBandOf,
  selectAdminPlayers,
} from './management.rules'

describe('Admin player management rules', () => {
  it('maps the nine levels and keeps unranked outside the bands', () => {
    expect(Array.from({ length: 9 }, (_, i) => levelBandOf(i))).toEqual([
      'beginner',
      'beginner',
      'beginner',
      'intermediate',
      'intermediate',
      'intermediate',
      'advanced',
      'advanced',
      'advanced',
    ])
    expect(levelBandOf(null)).toBeNull()
    expect(levelBandOf(9)).toBeNull()
  })
  it('groups overlapping normalized name and contact matches without disclosing values', () => {
    const groups = duplicateGroups([
      { id: 'a', name: ' Alex   Reyes ', phone: '09171234567' },
      { id: 'b', name: 'alex reyes', email: 'demo@example.com' },
      { id: 'c', name: 'Different', email: ' DEMO@example.com ' },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.ids.sort()).toEqual(['a', 'b', 'c'])
    expect(groups[0]?.reasons.sort()).toEqual(['Same email', 'Same name'])
    expect(
      duplicateGroups([
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ]),
    ).toEqual([])
  })
  it('applies inclusive creation dates, place and archive before paging and counts', () => {
    const rows = [
      managementPlayer,
      {
        ...managementPlayer,
        id: 'b',
        addedOn: '2026-10-02',
        levelBand: 'advanced' as const,
        claimed: true,
      },
      { ...managementPlayer, id: 'c', archivedAt: '2026-10-02' },
    ]
    const result = selectAdminPlayers(rows, {
      addedFrom: '2026-10-01',
      addedTo: '2026-10-02',
      place: ['CEB'],
    })
    expect(result.total).toBe(2)
    expect(result.stats).toEqual({
      advanced: 1,
      intermediate: 0,
      beginner: 0,
      noRank: 1,
      registered: 1,
      unclaimed: 1,
    })
    expect(selectAdminPlayers(rows, { archived: 'archived' }).rows.map((p) => p.id)).toEqual(['c'])
    expect(selectAdminPlayers(rows, { addedFrom: '2026-10-02', addedTo: '2026-10-02' }).total).toBe(
      1,
    )
    expect(selectAdminPlayers(rows, { place: ['MNL'] }).total).toBe(0)
    expect(adminPlayerStats([]).noRank).toBe(0)
  })
  it('clamps invalid and out-of-range pages, including empty results', () => {
    const rows = Array.from({ length: 76 }, (_, i) => ({ ...managementPlayer, id: String(i) }))
    const result = selectAdminPlayers(rows, { page: 999, pageSize: 25 })
    expect(result.page).toBe(4)
    expect(result.rows).toHaveLength(1)
    expect(result.stats.noRank).toBe(76)
    expect(selectAdminPlayers([], { page: 20 }).page).toBe(1)
    expect(selectAdminPlayers(rows, { page: -1 }).page).toBe(1)
  })
  it('keeps a duplicate group together across pagination boundaries', () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      ...managementPlayer,
      id: String(i),
      name: i < 24 ? 'Group A' : 'Group B',
      phone: undefined,
      email: undefined,
    }))
    const first = selectAdminPlayers(rows, { duplicates: true, pageSize: 25 })
    const second = selectAdminPlayers(rows, { duplicates: true, pageSize: 25, page: 2 })
    expect(first.rows).toHaveLength(24)
    expect(second.rows).toHaveLength(6)
    expect(second.start).toBe(25)
    expect(second.end).toBe(30)
  })
})
