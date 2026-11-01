import 'server-only'
import type { MatchContext } from '@rotra/data/match/match.rules'
import type { Match as MatchView } from '@rotra/data/match/match.types'
import type { SessionCourt as CourtView } from '@rotra/data/queue-session/queueSession.types'
import type { SessionPlayer as RosterView } from '@rotra/data/session-roster/sessionRoster.types'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { Prisma, QueueSession } from '../generated/prisma/client'
import { requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { toDecimalString, toIsoOrNull } from '../service/serialize'
import {
  levelCodeFor,
  liveCourts,
  liveRoster,
  lockSession,
  mapDatabaseError,
  requireSessionAccess,
  requireState,
  type Tx,
} from './session-store'

const MATCH_INCLUDE = {
  participations: { orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }] },
  courtHolds: true,
  courtUsage: { orderBy: [{ acquiredAt: 'asc' }, { id: 'asc' }] },
  decision: true,
} satisfies Prisma.MatchInclude

export type MatchRow = Prisma.MatchGetPayload<{ include: typeof MATCH_INCLUDE }>

/**
 * The shared rule shape (`@rotra/data/match`) from stored rows: current team members are open
 * segments; a substitution is a closed segment and the segment opened by the same operation.
 */
export function matchView(row: MatchRow): MatchView {
  const open = row.participations.filter((p) => !p.leftAt)
  const closed = row.participations.filter((p) => p.leftAt && p.leftOperationId)
  const substitutions = closed.flatMap((out) => {
    const incoming = row.participations.find(
      (p) => p.joinedOperationId === out.leftOperationId && p.id !== out.id,
    )
    return incoming
      ? [{ outId: out.sessionPlayerId, inId: incoming.sessionPlayerId, team: out.team, at: out.leftAt?.getTime() ?? 0 }]
      : []
  })
  const members = row.state === 'waiting' || row.state === 'active' ? open : row.participations.filter((p) => p.finishedWithMatch)
  return {
    id: row.id,
    sessionId: row.sessionId,
    matchNo: row.matchNo,
    state: row.state,
    format: row.format,
    queuePosition: Number(row.queuePosition ?? 0),
    origin: row.origin,
    manualProtected: row.manualProtected,
    teamA: members.filter((p) => p.team === 'A').map((p) => p.sessionPlayerId),
    teamB: members.filter((p) => p.team === 'B').map((p) => p.sessionPlayerId),
    courtIds:
      row.state === 'active'
        ? row.courtHolds.map((h) => h.courtId)
        : row.courtUsage.map((u) => u.courtId),
    startedAt: row.startedAt?.getTime() ?? null,
    endedAt: row.endedAt?.getTime() ?? null,
    substitutions,
    decision: row.decision
      ? {
          kind: row.decision.kind,
          winningTeam: row.decision.winningTeam,
          teamAScore: row.decision.teamAScore,
          teamBScore: row.decision.teamBScore,
          confirmedAt: row.decision.confirmedAt.getTime(),
        }
      : null,
  }
}

/** Wire shape: the rule shape with ISO times and the match revision. */
export function matchDto(row: MatchRow) {
  const view = matchView(row)
  return {
    ...view,
    startedAt: toIsoOrNull(row.startedAt),
    endedAt: toIsoOrNull(row.endedAt),
    substitutions: view.substitutions.map((s) => ({ ...s, at: new Date(s.at).toISOString() })),
    decision: view.decision && {
      ...view.decision,
      confirmedAt: new Date(view.decision.confirmedAt).toISOString(),
    },
    revision: toDecimalString(row.revision),
  }
}

export function sessionMatches(tx: Tx, sessionId: string) {
  return tx.match.findMany({
    where: { sessionId, removedAt: null },
    include: MATCH_INCLUDE,
    orderBy: [{ matchNo: 'asc' }],
  })
}

export function loadMatch(tx: Tx, sessionId: string, matchId: string) {
  return tx.match.findFirst({ where: { id: matchId, sessionId }, include: MATCH_INCLUDE })
}

/** Roster, matches and courts in the shared rule shapes, read inside the command's transaction. */
export async function matchContext(tx: Tx, session: QueueSession) {
  const [roster, rows, courts] = await Promise.all([
    liveRoster(tx, session.id),
    sessionMatches(tx, session.id),
    liveCourts(tx, session.id),
  ])
  const nicknames = new Map(
    (
      await tx.clubPlayer.findMany({
        where: { clubId: session.clubId, id: { in: roster.map((r) => r.clubPlayerId) } },
        select: { id: true, nickname: true },
      })
    ).map((p) => [p.id, p.nickname]),
  )
  const ctx: MatchContext = {
    roster: roster.map(
      (r): RosterView => ({
        id: r.id,
        sessionId: r.sessionId,
        clubPlayerId: r.clubPlayerId,
        nameSnapshot: r.nameSnapshot,
        nicknameSnapshot: nicknames.get(r.clubPlayerId) ?? null,
        present: r.present,
        presentChangedAt: r.presentChangedAt.getTime(),
        level: levelCodeFor(r.skillLevelId),
        levelLockedAt: r.levelLockedAt?.getTime() ?? null,
        confirmedAt: r.confirmedAt.getTime(),
      }),
    ),
    matches: rows.map(matchView),
    courts: courts.map(
      (c): CourtView => ({
        id: c.id,
        sessionId: c.sessionId,
        label: c.label,
        openUntil: c.openUntil?.getTime() ?? null,
        removedAt: null,
      }),
    ),
  }
  return { ctx, rows, roster }
}

/**
 * Runs a queue or match command on the locked, active session. `expectedQueueRevision` (when the
 * screen loaded one) must match, so a stale reorder or regeneration fails truthfully instead of
 * committing against changed inputs. Every change bumps `queue_revision`.
 */
export async function matchCommand<T>(
  context: ClubContext,
  sessionId: string,
  options: { expectedQueueRevision?: string; expectedRevision?: string; states?: QueueSession['state'][] },
  change: (tx: Tx, session: QueueSession) => Promise<T>,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await lockSession(tx, context, sessionId)
      await requireSessionAccess(context, session)
      requireState(session, options.states ?? ['active'], 'Start the session first.')
      if (options.expectedQueueRevision !== undefined)
        requireRevision(session.queueRevision, options.expectedQueueRevision)
      if (options.expectedRevision !== undefined) requireRevision(session.revision, options.expectedRevision)
      const result = await change(tx, session)
      const bumped = await tx.queueSession.update({
        where: { id: session.id },
        data: { queueRevision: { increment: 1 } },
        select: { queueRevision: true },
      })
      return { result, queueRevision: toDecimalString(bumped.queueRevision) }
    })
  } catch (error) {
    if (error instanceof ServiceError) throw error
    mapDatabaseError(error)
  }
}

/** Next immutable match number for the session (session row locked). Numbers are never reused. */
export async function nextMatchNo(tx: Tx, sessionId: string) {
  const top = await tx.match.aggregate({ where: { sessionId }, _max: { matchNo: true } })
  return (top._max.matchNo ?? 0) + 1
}

/** Next queue position after every waiting match (removed drafts keep their numbers, not slots). */
export async function nextQueuePosition(tx: Tx, sessionId: string) {
  const top = await tx.match.aggregate({
    where: { sessionId, state: 'waiting', removedAt: null },
    _max: { queuePosition: true },
  })
  return (top._max.queuePosition ?? 0n) + 1n
}
