import type { Match } from '../match/match.types'
import { createConsoleFixtures } from './consoleSessions'

/**
 * Story and test scenario for Plan Ahead and the expected finish (Q27.6, D-2026-11-23-08 and -09):
 * a 16/31 session (typical 15 min, long 25) with Court 1 Finishing soon (13 min played), Court 2
 * mid-game (5 min played, "Ends in about 10 min"), Court 4 Getting ready (Not started yet), and
 * the other present players free. Plan Ahead uses the free players and Court 1's; it leaves out
 * Court 2's and Court 4's. Nobody is in the Main Queue. The normal store starts with no matches.
 */
export function createPlanAheadFixtures(now = Date.now()) {
  const { session, roster, courts } = createConsoleFixtures(now)
  const pid = (i: number) => {
    const p = roster[i]
    if (!p) throw new Error('Missing roster fixture.')
    return p.id
  }
  const court = (label: string) => {
    const c = courts.find((c) => c.label === label)
    if (!c) throw new Error('Missing court fixture.')
    return c.id
  }
  const match = (
    n: number,
    players: [number, number, number, number],
    courtLabel: string,
    minutes: number | null,
  ): Match => ({
    id: `plan-ahead-match-${n}`,
    sessionId: session.id,
    matchNo: n,
    state: minutes == null ? 'on_court' : 'active',
    format: 'doubles',
    queuePosition: n,
    origin: 'manual',
    manualProtected: true,
    teamA: [pid(players[0]), pid(players[1])],
    teamB: [pid(players[2]), pid(players[3])],
    courtIds: [court(courtLabel)],
    placedAt: now - ((minutes ?? 0) + 2) * 60000,
    startedAt: minutes == null ? null : now - minutes * 60000,
    endedAt: null,
    substitutions: [],
    decision: null,
  })
  const finishingSoon = match(1, [0, 1, 2, 3], 'Court 1', 13),
    midGame = match(2, [4, 6, 7, 8], 'Court 2', 5),
    gettingReady = match(3, [9, 10, 11, 12], 'Court 4', null)
  return {
    now,
    session,
    roster,
    courts,
    matches: [finishingSoon, midGame, gettingReady],
    finishingSoon,
    midGame,
    gettingReady,
  }
}
