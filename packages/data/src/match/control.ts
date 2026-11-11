import { MockError } from '../mock/errors'
import { type MockState, readMockState } from '../mock/store'
import { queueMutation } from '../mock/transaction'
import { dispatch } from '../outbox/dispatch'
import { autoFillCourts, autoFillNote, putOnCourt } from '../queue-session/courtFill'
import type { SyncArea } from '../sync/sync.types'
import {
  canMoveCourt,
  canPlace,
  canReplacePlayer,
  canSendBack,
  canStart,
  courtNames,
  replacedLineup,
  SUBSTITUTION_CREDITS,
  shortName,
  substitutionCandidates,
  substitutionSlots,
  swapTarget,
  validateResult,
  waitingMatches,
} from './match.rules'
import type { Match, SubstitutionCredit } from './match.types'
import { matchContext, requireLive } from './queue.mutations'

function control(
  input: { matchId: string; operationId: string },
  kind: string,
  fn: (s: MockState, m: Match) => string,
  area: SyncArea = 'Matches and results',
) {
  const current = readMockState().matches.find((m) => m.id === input.matchId)
  if (!current) throw new MockError('permission', 'Match not available.')
  if (!input.operationId.trim()) throw new MockError('permission', 'A confirmation ID is required.')
  return queueMutation(
    {
      area,
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
  return dispatch('match.place', input, () =>
    control(input, 'place', (s, m) => {
      if (!canPlace(m, input.courtIds, matchContext(s, m.sessionId)))
        throw new MockError('conflict', 'Something changed. Review the match again.')
      putOnCourt(m, input.courtIds)
      return `Match ${m.matchNo} on ${courtNames(m, s.courts)} · getting ready`
    }),
  )
}
/**
 * Start match. From On court (Q-ON-COURT, court card): one tap on the held court(s), so
 * `courtIds` may be empty; rechecks presence and busy players and starts the timer. From waiting:
 * the older one-step start (places and starts at once), kept for callers not yet moved to
 * Put on court.
 */
export function startMatch(input: { matchId: string; courtIds?: string[]; operationId: string }) {
  return dispatch('match.start', input, () =>
    control(input, 'start', (s, m) => {
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
    }),
  )
}
const changed = () => new MockError('conflict', 'Something changed. Review the match again.')
/** Off the court and back into the queue: holds released, no placement time. */
function unplace(m: Match) {
  m.state = 'waiting'
  m.courtIds = []
  m.placedAt = null
  m.startedAt = null
}
/**
 * Send back to queue (Q-ON-COURT): the On court match goes to the **top** of the queue and its
 * court(s) free up. It keeps `manualProtected`, so a match edited while On court (Replace player)
 * goes back protected. In Auto Queue the freed court is refilled, in the same write, with the next
 * eligible match other than this one. Allowed offline (auto filling pauses offline).
 */
export function sendBackToQueue(input: { matchId: string; operationId: string }) {
  return dispatch('match.sendBack', input, () =>
    control(
      input,
      'send-back',
      (s, m) => {
        if (!canSendBack(m)) throw changed()
        const where = courtNames(m, s.courts)
        const rest = waitingMatches(s.matches.filter((x) => x.sessionId === m.sessionId))
        unplace(m)
        for (const [i, x] of [m, ...rest].entries()) x.queuePosition = i + 1
        const placed = autoFillCourts(s, m.sessionId, { exceptMatchId: m.id })
        return `Match ${m.matchNo} back to #1 in the queue · ${where} free${autoFillNote(s, placed)}`
      },
      'Queue',
    ),
  )
}
/**
 * Move to another court (Q-ON-COURT): the On court match takes free open court(s) (two for 5v5)
 * and releases the ones it held. Still On court, nothing starts. In Auto Queue the court it left
 * is refilled in the same write. Allowed offline (auto filling pauses offline).
 */
export function moveCourt(input: { matchId: string; courtIds: string[]; operationId: string }) {
  return dispatch('match.moveCourt', input, () =>
    control(input, 'move-court', (s, m) => {
      if (!canMoveCourt(m, input.courtIds, matchContext(s, m.sessionId))) throw changed()
      const from = courtNames(m, s.courts)
      m.courtIds = [...input.courtIds]
      const placed = autoFillCourts(s, m.sessionId)
      return `Match ${m.matchNo} moved from ${from} to ${courtNames(m, s.courts)} · getting ready${autoFillNote(s, placed)}`
    }),
  )
}
/**
 * Replace player (Q-ON-COURT): a plain lineup change on an On court match. The incoming player
 * takes the slot and is a full participant; no substitution is recorded and no game credit is
 * asked. The match becomes manual and protected, so it goes back protected if sent back.
 */
export function replacePlayer(input: {
  matchId: string
  outId: string
  inId: string
  operationId: string
}) {
  return dispatch('match.replace', input, () =>
    control(input, 'replace', (s, m) => {
      if (!canReplacePlayer(m, input.outId, input.inId, matchContext(s, m.sessionId)))
        throw changed()
      const incoming = s.roster.find((p) => p.id === input.inId),
        out = s.roster.find((p) => p.id === input.outId)
      if (!incoming || !out) throw changed()
      const lineup = replacedLineup(m, input.outId, input.inId)
      m.teamA = lineup.teamA
      m.teamB = lineup.teamB
      m.origin = 'manual'
      m.manualProtected = true
      return `Match ${m.matchNo}: ${shortName(incoming)} in for ${shortName(out)} · lineup changed`
    }),
  )
}
/**
 * Swap with the queue (Q-ON-COURT): `withMatchId` is the match the screen showed as the swap target
 * (`swapTarget`). It is rechecked here; if the target is no longer the same match the swap is
 * refused. The target goes on this match's court(s) as On court, and this match takes the target's
 * queue position (not the top), keeping `manualProtected`. Allowed offline.
 */
export function swapWithQueue(input: {
  matchId: string
  withMatchId: string
  operationId: string
}) {
  return dispatch('match.swapWithQueue', input, () =>
    control(
      input,
      'swap',
      (s, m) => {
        const target = swapTarget(m, matchContext(s, m.sessionId))
        const n = target && s.matches.find((x) => x.id === target.match.id)
        if (!target || !n || n.id !== input.withMatchId) throw changed()
        const where = courtNames(m, s.courts),
          courtIds = [...m.courtIds],
          position = n.queuePosition
        unplace(m)
        m.queuePosition = position
        putOnCourt(n, courtIds)
        const at =
          waitingMatches(s.matches.filter((x) => x.sessionId === m.sessionId)).indexOf(m) + 1
        return `Match ${n.matchNo} swapped onto ${where} · getting ready · Match ${m.matchNo} back to #${at} in the queue`
      },
      'Queue',
    ),
  )
}
/**
 * Match done. In Auto Queue the freed court(s) get the next eligible match in the same write,
 * except `holdCourtId`: the court the next-match picker (Q-NEXT-MATCH) opens for stays free, and
 * Skip for now hands it back to Auto Queue (fillOpenedCourts with afterSkip).
 */
export function completeMatch(input: {
  matchId: string
  winningTeam?: 'A' | 'B' | null
  teamAScore?: number | null
  teamBScore?: number | null
  operationId: string
  holdCourtId?: string
}) {
  return dispatch('match.complete', input, () =>
    control(input, 'complete', (s, m) => {
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
      const placed = autoFillCourts(s, m.sessionId, {
        exceptCourtIds: input.holdCourtId ? [input.holdCourtId] : undefined,
      })
      return `Team ${result.winner} wins match ${m.matchNo} · ${courtNames(m, s.courts)} free${autoFillNote(s, placed)}`
    }),
  )
}
/** Invalid. In Auto Queue the freed court(s) get the next eligible match in the same write. */
export function invalidateMatch(input: { matchId: string; operationId: string }) {
  return dispatch('match.invalidate', input, () =>
    control(input, 'invalidate', (s, m) => {
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
      const placed = autoFillCourts(s, m.sessionId)
      return `Match ${m.matchNo} marked invalid · ${courtNames(m, s.courts)} free${autoFillNote(s, placed)}`
    }),
  )
}
/**
 * Substitute (Q-SUBSTITUTE) in a Playing match, with who gets this game (QM choice): Nobody
 * (default), the incoming or the outgoing player. One person per team slot: naming a person clears
 * any earlier choice for the same slot. Only while Playing, so the choice is frozen at Match done or
 * invalid.
 */
export function substitutePlayer(input: {
  matchId: string
  outId: string
  inId: string
  creditTo?: SubstitutionCredit
  operationId: string
}) {
  return dispatch('match.substitute', input, () =>
    control(input, 'substitute', (s, m) => {
      requireActive(m)
      const creditTo = input.creditTo ?? 'none'
      if (!SUBSTITUTION_CREDITS.includes(creditTo))
        throw new MockError('permission', 'Choose who gets this game.')
      const incoming = substitutionCandidates(m, s.roster, s.matches).find(
          (p) => p.id === input.inId,
        ),
        out = s.roster.find((p) => p.id === input.outId),
        team = m.teamA.includes(input.outId) ? 'A' : m.teamB.includes(input.outId) ? 'B' : null
      if (!incoming || !out || !team)
        throw new MockError('conflict', 'Something changed. Review the match again.')
      const key = team === 'A' ? 'teamA' : 'teamB'
      m[key] = m[key].map((id) => (id === input.outId ? input.inId : id))
      m.substitutions.push({ outId: input.outId, inId: input.inId, team, at: Date.now(), creditTo })
      if (creditTo !== 'none') {
        const slots = substitutionSlots(m.substitutions),
          mine = slots[slots.length - 1]
        m.substitutions.forEach((sub, i) => {
          if (i < slots.length - 1 && slots[i] === mine && (sub.creditTo ?? 'none') !== 'none')
            sub.creditTo = 'none'
        })
      }
      const who = creditTo === 'incoming' ? incoming : creditTo === 'outgoing' ? out : null,
        gets = who ? ` · ${shortName(who)} gets the game` : ''
      return `${shortName(incoming)} in for ${shortName(out)}${gets}`
    }),
  )
}
