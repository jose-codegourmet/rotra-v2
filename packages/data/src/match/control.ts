import { MockError } from '../mock/errors'
import { type MockState, readMockState } from '../mock/store'
import { queueMutation } from '../mock/transaction'
import {
  realCompleteMatch,
  realInvalidateMatch,
  realPlaceOnCourt,
  realStartMatch,
  realSubstitutePlayer,
} from '../real/match'
import { isRealDataMode } from '../real/mode'
import {
  canPlace,
  canStart,
  courtNames,
  shortName,
  substitutionCandidates,
  validateResult,
} from './match.rules'
import type { Match } from './match.types'
import { matchContext, requireLive } from './queue.mutations'

function control(
  input: { matchId: string; operationId: string },
  kind: string,
  fn: (s: MockState, m: Match) => string,
) {
  const current = readMockState().matches.find((m) => m.id === input.matchId)
  if (!current) throw new MockError('permission', 'Match not available.')
  if (!input.operationId.trim()) throw new MockError('permission', 'A confirmation ID is required.')
  return queueMutation(
    {
      area: 'Matches and results',
      sessionId: current.sessionId,
      operationId: input.operationId,
      fingerprint: JSON.stringify([
        kind,
        Object.entries(input).sort(([a], [b]) => a.localeCompare(b)),
      ]),
    },
    (s) => {
      requireLive(s, current.sessionId)
      const m = s.matches.find((m) => m.id === input.matchId)
      if (!m) throw new MockError('permission', 'Match not available.')
      return { data: null, text: fn(s, m) }
    },
  )
}
function requireActive(m: Match) {
  if (m.state !== 'active' || m.decision)
    throw new MockError('conflict', 'This match already has a confirmed outcome or is not active.')
}
/**
 * Put on court (Q-DISPATCH): the match takes its court(s) and its players become busy, but nothing
 * starts: `placedAt` is set, `startedAt` stays null. Allowed offline like any queue mutation.
 */
export function placeOnCourt(input: { matchId: string; courtIds: string[]; operationId: string }) {
  if (isRealDataMode()) return realPlaceOnCourt(input)
  return control(input, 'place', (s, m) => {
    if (!canPlace(m, input.courtIds, matchContext(s, m.sessionId)))
      throw new MockError('conflict', 'Something changed. Review the match again.')
    m.state = 'on_court'
    m.courtIds = [...input.courtIds]
    m.placedAt = Date.now()
    m.startedAt = null
    return `Match ${m.matchNo} on ${courtNames(m, s.courts)} · getting ready`
  })
}
/**
 * Start match. From On court (Q-ON-COURT, court card): one tap on the held court(s), so
 * `courtIds` may be empty; rechecks presence and busy players and starts the timer. From waiting:
 * the older one-step start (places and starts at once), kept for callers not yet moved to
 * Put on court.
 */
export function startMatch(input: { matchId: string; courtIds?: string[]; operationId: string }) {
  if (isRealDataMode()) return realStartMatch(input)
  return control(input, 'start', (s, m) => {
    if (!canStart(m, input.courtIds ?? [], matchContext(s, m.sessionId)))
      throw new MockError('conflict', 'Something changed. Review the match again.')
    const now = Date.now()
    if (m.state === 'waiting') {
      m.courtIds = [...(input.courtIds ?? [])]
      m.placedAt = now
    }
    m.state = 'active'
    m.startedAt = now
    return `Match ${m.matchNo} started on ${courtNames(m, s.courts)}`
  })
}
export function completeMatch(input: {
  matchId: string
  winningTeam?: 'A' | 'B' | null
  teamAScore?: number | null
  teamBScore?: number | null
  operationId: string
}) {
  if (isRealDataMode()) return realCompleteMatch(input)
  return control(input, 'complete', (s, m) => {
    requireActive(m)
    const result = validateResult({
      winner: input.winningTeam,
      scoreA: input.teamAScore,
      scoreB: input.teamBScore,
    })
    if (result.error) throw new MockError('permission', result.error)
    m.state = 'completed'
    m.endedAt = Date.now()
    m.decision = {
      kind: 'completed',
      winningTeam: result.winner,
      teamAScore: input.teamAScore ?? null,
      teamBScore: input.teamBScore ?? null,
      confirmedAt: m.endedAt,
    }
    return `Team ${result.winner} wins match ${m.matchNo} · ${courtNames(m, s.courts)} free`
  })
}
export function invalidateMatch(input: { matchId: string; operationId: string }) {
  if (isRealDataMode()) return realInvalidateMatch(input)
  return control(input, 'invalidate', (s, m) => {
    requireActive(m)
    m.state = 'invalid'
    m.endedAt = Date.now()
    m.decision = {
      kind: 'invalid',
      winningTeam: null,
      teamAScore: null,
      teamBScore: null,
      confirmedAt: m.endedAt,
    }
    return `Match ${m.matchNo} marked invalid · ${courtNames(m, s.courts)} free`
  })
}
export function substitutePlayer(input: {
  matchId: string
  outId: string
  inId: string
  operationId: string
}) {
  if (isRealDataMode()) return realSubstitutePlayer(input)
  return control(input, 'substitute', (s, m) => {
    requireActive(m)
    const incoming = substitutionCandidates(m, s.roster, s.matches).find(
        (p) => p.id === input.inId,
      ),
      out = s.roster.find((p) => p.id === input.outId),
      team = m.teamA.includes(input.outId) ? 'A' : m.teamB.includes(input.outId) ? 'B' : null
    if (!incoming || !out || !team)
      throw new MockError('conflict', 'Something changed. Review the match again.')
    const key = team === 'A' ? 'teamA' : 'teamB'
    m[key] = m[key].map((id) => (id === input.outId ? input.inId : id))
    m.substitutions.push({ outId: input.outId, inId: input.inId, team, at: Date.now() })
    return `${shortName(incoming)} in for ${shortName(out)}`
  })
}
