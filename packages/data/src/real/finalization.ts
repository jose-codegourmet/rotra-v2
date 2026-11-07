import { activeMatches, courtNames, onCourtMatches } from '../match/match.rules'
import type {
  FinalizationStage,
  SessionDoneReview,
  SessionFinalization,
} from '../queue-session/queueSession.types'
import { RealRequestError, realRequest } from './client'
import { realGetSessionMatches } from './match'
import { accepted, realGetQueueSession, realGetSessionRoster } from './queue'

/**
 * Real-mode transport for Session done (Q-SESSION-DONE, Q-FINALIZE-PROGRESS). Online only. The
 * server checks the proposed #246 barriers (no active match, completeness proven, an effective
 * ranking policy) under the session lock and commits once per session; the same request then runs
 * the session's projection and slide jobs (interim in-request worker, #243), and every status read
 * runs whatever is still outstanding.
 */

const sessionPath = (sessionId: string) => `/api/sessions/${encodeURIComponent(sessionId)}`

type WireReview = {
  blocking: string[]
  activeMatches: number
  completeness: {
    proven: boolean
    openStreams: number
    openConflicts: number
    pendingOperations: number
  }
  belowMinimum: { sessionPlayerId: string; name: string; games: number }[]
}

/**
 * The review sheet's counts come from the saved session, roster and matches; the shortfall comes
 * from the server's own count of full games (the same segments finalization uses).
 */
export async function realGetSessionDoneReview(sessionId: string): Promise<SessionDoneReview> {
  const [review, session, matches, { roster }] = await Promise.all([
    realRequest<WireReview>(`${sessionPath(sessionId)}/done-review`),
    realGetQueueSession(sessionId),
    realGetSessionMatches(sessionId),
    realGetSessionRoster(sessionId),
  ])
  const clubPlayerOf = new Map(roster.map((r) => [r.id, r.clubPlayerId]))
  return {
    sessionId,
    gamesRecorded: matches.filter((m) => m.state === 'completed').length,
    participants: roster.length,
    pendingChanges: review.completeness.pendingOperations,
    activeGames: activeMatches(matches).map((m) => ({
      matchId: m.id,
      courtLabels: courtNames(m, session.courts).split(' + '),
    })),
    onCourtDropped: onCourtMatches(matches).length,
    unplayedWaiting: matches.filter((m) => m.state === 'waiting').length,
    belowMinimum: review.belowMinimum.map((p) => ({
      clubPlayerId: clubPlayerOf.get(p.sessionPlayerId) ?? p.sessionPlayerId,
      name: p.name,
      completedGames: p.games,
    })),
    minimum: session.minimumGames,
  }
}

type WireStatus = {
  sessionId: string
  commandId: string
  state: 'running' | 'committed' | 'done' | 'failed'
  stage: FinalizationStage
  accepted: boolean
  failedStage: FinalizationStage | null
  jobs: { kind: string; status: 'pending' | 'running' | 'done' | 'failed' }[]
}

/**
 * The screen's finalization shape. After commit the session is complete whatever the jobs do: a
 * failed job shows as `committed` with its stage (Try again re-runs only the jobs), jobs still
 * outstanding show as `running` (the screen keeps polling, and each poll runs them).
 */
function finalizationOf(wire: WireStatus): SessionFinalization {
  const base = { sessionId: wire.sessionId, commandId: wire.commandId }
  if (wire.state === 'done') return { ...base, state: 'done', stage: 'slides' }
  if (!wire.accepted)
    return wire.state === 'failed'
      ? { ...base, state: 'failed', stage: wire.stage, failedStage: wire.failedStage ?? wire.stage }
      : { ...base, state: 'running', stage: wire.stage }
  const failedJob = wire.jobs.find((j) => j.status === 'failed')
  if (wire.state === 'failed' || failedJob) {
    const failedStage =
      wire.failedStage ?? (failedJob?.kind === 'result_snapshot' ? 'slides' : 'player_records')
    return { ...base, state: 'committed', stage: failedStage, failedStage }
  }
  return { ...base, state: 'running', stage: wire.stage }
}

const DONE_TOAST = 'Session finished · player records updated'
const PREPARING = 'Session finished; results are being prepared'

export async function realFinalizeSession(input: { sessionId: string; commandId: string }) {
  const { status } = await realRequest<{ status: WireStatus }>(
    `${sessionPath(input.sessionId)}/finalization`,
    { method: 'POST', body: { commandId: input.commandId } },
  )
  const data = finalizationOf(status)
  return accepted(data, data.state === 'done' ? DONE_TOAST : PREPARING)
}

/** Null until a finalization committed (a refused Session done leaves nothing to recover). */
export async function realGetFinalizationStatus(
  sessionId: string,
): Promise<SessionFinalization | null> {
  try {
    return finalizationOf(await realRequest<WireStatus>(`${sessionPath(sessionId)}/finalization`))
  } catch (error) {
    if (error instanceof RealRequestError && error.status === 404) return null
    throw error
  }
}
