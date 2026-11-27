import { gamesWon } from '@rotra/schema/scoring'
import { withClubNickname } from '../club-player/clubNickname.rules'
import { getConnectivity } from '../connectivity/connectivity'
import { MockError } from '../mock/errors'
import { type MockState, readMockState } from '../mock/store'
import { queueMutation } from '../mock/transaction'
import { dispatch } from '../outbox/dispatch'
import { autoFillCourts, autoFillNote, putOnCourt } from '../queue-session/courtFill'
import { sessionScoring } from '../queue-session/queueSession.types'
import {
  realPauseMatch,
  realSetAlmostDone,
  realSwapFromMatch,
  realTradeCourts,
} from '../real/match'
import { isRealDataMode } from '../real/mode'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import type { SyncArea } from '../sync/sync.types'
import {
  almostDoneText,
  canMovePlaying,
  canPauseMatch,
  canSetAlmostDone,
  canSwapFromMatch,
  canTradeCourts,
  movedCourtText,
  pausedText,
  swappedPlacesText,
  tradedCourtsText,
  tradedLineup,
} from './liveMatch.rules'
import {
  canMoveCourt,
  canPlace,
  canReplacePlayer,
  canSendBack,
  canStart,
  courtNames,
  queueMasterName,
  replacedLineup,
  SUBSTITUTION_CREDITS,
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
/** Online only in real mode (November 25, 2026): never queued offline; `realRequest` refuses offline. */
function realOnline<T>(action: string, run: () => Promise<T>) {
  if (getConnectivity() === 'offline')
    throw new MockError('offline', `${action} needs an internet connection.`)
  return run()
}
/**
 * Pause match (Q-CONSOLE court card, Q-ACTIVE-MATCH): a Playing match started by mistake goes back
 * to Getting ready on the same court(s). The start time clears, so Start match gives it a fresh
 * one; players, sides and substitutions stay and nothing is recorded. Not a timer pause. The court
 * never frees, so Auto Queue does nothing. Real mode (November 25, 2026): online only.
 */
export async function pauseMatch(input: { matchId: string; operationId: string }) {
  if (isRealDataMode()) return realOnline('Pausing a match', () => realPauseMatch(input))
  return control(input, 'pause', (s, m) => {
    if (!canPauseMatch(m)) throw changed()
    m.state = 'on_court'
    m.startedAt = null
    if (m.almostDoneAt != null) m.almostDoneAt = null
    m.placedAt = m.placedAt ?? Date.now()
    return pausedText(m.matchNo, courtNames(m, s.courts))
  })
}
/**
 * Almost done (Q-CONSOLE court card, Q-ACTIVE-MATCH; D-2026-11-25-02): the Queue Master's switch on
 * a Playing match. Plan Ahead then counts its players as free soon with 0 minutes left. A match
 * that left Playing meanwhile is refused. Real mode (November 26, 2026): online only, like Pause
 * match. Match done, Pause match and Mark invalid turn it off.
 */
export async function setAlmostDone(input: { matchId: string; on: boolean; operationId: string }) {
  if (isRealDataMode()) return realOnline('Switching Almost done', () => realSetAlmostDone(input))
  return control(input, 'almost-done', (s, m) => {
    if (!canSetAlmostDone(m)) throw changed()
    m.almostDoneAt = input.on ? Date.now() : null
    return almostDoneText(m.matchNo, courtNames(m, s.courts), input.on)
  })
}
/**
 * Move to another court (Q-ON-COURT, Q-ACTIVE-MATCH, court drag): the match takes free open
 * court(s) (two for 5v5) and releases the ones it held. A Getting ready match stays On court and
 * nothing starts; a Playing match (owner, November 19, 2026; real mode November 25, 2026) keeps playing with the
 * same start time. In Auto Queue the court it left is refilled in the same write. Allowed offline
 * (auto filling pauses offline), except a Playing match, which needs the server.
 */
export function moveCourt(input: { matchId: string; courtIds: string[]; operationId: string }) {
  return dispatch('match.moveCourt', input, () =>
    control(input, 'move-court', (s, m) => {
      const playing = m.state === 'active'
      // Offline in real mode this runs over the downloaded copy: a Playing move must not be queued;
      // online it goes to the server (real mode November 25, 2026).
      if (playing && isRealDataMode())
        throw new MockError('offline', 'Moving a playing match needs an internet connection.')
      const allowed = playing ? canMovePlaying : canMoveCourt
      if (!allowed(m, input.courtIds, matchContext(s, m.sessionId))) throw changed()
      const from = courtNames(m, s.courts)
      m.courtIds = [...input.courtIds]
      const placed = autoFillCourts(s, m.sessionId)
      return `${movedCourtText(m.matchNo, from, courtNames(m, s.courts), playing)}${autoFillNote(s, placed)}`
    }),
  )
}
/**
 * Trade courts (Q-CONSOLE court drag, owner, November 25, 2026): a one-court match dropped on another
 * busy one-court court; the two matches swap courts and each keeps its state and start time. No
 * court frees, so Auto Queue does nothing. Real mode: online only.
 */
export async function tradeCourts(input: {
  matchId: string
  withMatchId: string
  operationId: string
}) {
  if (isRealDataMode()) return realOnline('Swapping courts', () => realTradeCourts(input))
  return control(input, 'trade-courts', (s, m) => {
    const n = s.matches.find((x) => x.id === input.withMatchId)
    if (!n || n.sessionId !== m.sessionId || !canTradeCourts(m, n)) throw changed()
    const mine = m.courtIds
    m.courtIds = [...n.courtIds]
    n.courtIds = [...mine]
    return tradedCourtsText(m.matchNo, courtNames(m, s.courts), n.matchNo, courtNames(n, s.courts))
  })
}
/**
 * Swap from match (Replace player sheet, Q-ON-COURT and Q-ACTIVE-MATCH): the player coming out and
 * an opponent in this same match trade places; nobody new joins and no substitution is recorded.
 * Like Replace player the match becomes manual and protected from regeneration. Real mode
 * (November 25, 2026): online only.
 */
export async function swapFromMatch(input: {
  matchId: string
  /** The player coming out. */
  outId: string
  /** The opponent in this match they trade places with. */
  inId: string
  operationId: string
}) {
  if (isRealDataMode()) return realOnline('Swap from match', () => realSwapFromMatch(input))
  return control(input, 'swap-from-match', (s, m) => {
    if (!canSwapFromMatch(m, input.outId, input.inId)) throw changed()
    const out = s.roster.find((p) => p.id === input.outId),
      opponent = s.roster.find((p) => p.id === input.inId)
    if (!out || !opponent) throw changed()
    const lineup = tradedLineup(m, input.outId, input.inId)
    m.teamA = lineup.teamA
    m.teamB = lineup.teamB
    m.origin = 'manual'
    m.manualProtected = true
    const nameOf = (p: SessionPlayer) => queueMasterName(withClubNickname(s, p))
    return swappedPlacesText(m.matchNo, nameOf(out), nameOf(opponent))
  })
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
      const nameOf = (p: SessionPlayer) => queueMasterName(withClubNickname(s, p))
      return `Match ${m.matchNo}: ${nameOf(incoming)} in for ${nameOf(out)} · ${m.state === 'active' ? 'replaced (mistake fixed)' : 'lineup changed'}`
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
 *
 * Record games off takes a winner and score like any session (D-2026-11-20-02); only the
 * leaderboard, win-rate and rank reads leave the session out.
 */
export function completeMatch(input: {
  matchId: string
  winningTeam?: 'A' | 'B' | null
  teamAScore?: number | null
  teamBScore?: number | null
  /**
   * Best of 3 only (Q22): every game played, in order. `teamAScore` / `teamBScore` are then the
   * games each team won, worked out from these (what the call passes is not read).
   */
  games?: { a: number; b: number }[] | null
  operationId: string
  holdCourtId?: string
}) {
  return dispatch('match.complete', input, () =>
    control(input, 'complete', (s, m) => {
      requireActive(m)
      const fill = () =>
        autoFillCourts(s, m.sessionId, {
          exceptCourtIds: input.holdCourtId ? [input.holdCourtId] : undefined,
        })
      const session = s.sessions.find((x) => x.id === m.sessionId)
      // The session's scoring mode decides which scores are refused (missing reads as 16/31).
      const games = input.games?.length ? input.games.map((g) => ({ a: g.a, b: g.b })) : null
      const result = validateResult({
        scoring: sessionScoring(session),
        winner: input.winningTeam,
        scoreA: input.teamAScore,
        scoreB: input.teamBScore,
        games,
      })
      if (result.error) throw new MockError('permission', result.error)
      const won = games ? gamesWon(games).wins : null
      m.state = 'completed'
      m.endedAt = Date.now()
      if (m.almostDoneAt != null) m.almostDoneAt = null
      m.decision = {
        kind: 'completed',
        winningTeam: result.winner,
        teamAScore: won ? won.A : (input.teamAScore ?? null),
        teamBScore: won ? won.B : (input.teamBScore ?? null),
        ...(games ? { games } : {}),
        confirmedAt: m.endedAt,
      }
      const placed = fill()
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
      if (m.almostDoneAt != null) m.almostDoneAt = null
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
      const nameOf = (p: SessionPlayer) => queueMasterName(withClubNickname(s, p)),
        who = creditTo === 'incoming' ? incoming : creditTo === 'outgoing' ? out : null,
        gets = who ? ` · ${nameOf(who)} gets the game` : ''
      return `${nameOf(incoming)} in for ${nameOf(out)}${gets}`
    }),
  )
}
