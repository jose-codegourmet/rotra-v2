import { FORMAT_LABELS } from '../match/match.rules'
import {
  createMatchCardFixtures,
  type MatchCardFixture,
  type MatchCardPlayerFixture,
} from './matchCards'

/** The lineup editor's slots: a player, or null for an empty slot that still accepts a drop. */
export type LineupSlotsFixture = {
  teamA: (MatchCardPlayerFixture | null)[]
  teamB: (MatchCardPlayerFixture | null)[]
}

/**
 * Story-only data for the queue grid and the switch-sides behaviour: a long waiting list for the
 * snake at every column count, one doubles card, one 1v2 card (team sizes differ) and a half-filled
 * lineup for the editor's empty-slot drop.
 */
export function createQueueGridFixtures(now = Date.now()) {
  const cards = createMatchCardFixtures(now)
  const cycle = [
    cards.ready,
    cards.needsAttention,
    cards.blocked,
    cards.suggested,
    cards.auto,
    cards.waitingForCourts,
    cards.longNames,
    cards.protectedManual,
  ]
  const renumber = (c: MatchCardFixture, i: number): MatchCardFixture => ({
    ...c,
    match: { ...c.match, id: `queue-grid-${i + 1}`, matchNo: i + 1, queuePosition: i + 1 },
  })

  /** Twelve waiting matches in queue order: three rows at 5 columns, twelve at 1. */
  const waiting = Array.from({ length: 12 }, (_, i) => {
    const c = cycle[i % cycle.length]
    if (!c) throw new Error('Missing match card fixture.')
    return renumber(c, i)
  })

  const doubles = renumber(cards.ready, 0)

  const firstA = cards.ready.teamA[0],
    firstAId = cards.ready.match.teamA[0]
  if (!firstA || !firstAId) throw new Error('Missing match card fixture.')
  /** Team A has one player, Team B two: switching sides keeps the sizes. */
  const oneVsTwo: MatchCardFixture = {
    ...renumber(cards.ready, 1),
    match: {
      ...renumber(cards.ready, 1).match,
      format: 'fun_1v2',
      teamA: [firstAId],
      teamB: cards.ready.match.teamB,
    },
    formatLabel: FORMAT_LABELS.fun_1v2,
    teamA: [firstA],
    teamB: cards.ready.teamB,
  }

  /** Doubles in the lineup editor with Team B's second slot still empty. */
  const lineupSlots: LineupSlotsFixture = {
    teamA: cards.ready.teamA,
    teamB: [cards.ready.teamB[0] ?? null, null],
  }

  return { waiting, doubles, oneVsTwo, lineupSlots }
}

export const queueGridFixtures = createQueueGridFixtures()
