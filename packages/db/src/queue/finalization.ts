import 'server-only'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { Prisma, ProjectionKind, SessionFinalization } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { toIso, toIsoOrNull } from '../service/serialize'
import { lockSession, mapDatabaseError, requireSessionAccess, type Tx } from './session-store'
import { sessionCompleteness } from './sync'

/** Reducer versions. A version is never permission to change a winner. */
export const FACT_VERSION = 1
export const SUMMARY_VERSION = 1

/** Downstream work Session done enqueues; each is unique per source + kind + version. */
export const FINALIZATION_JOBS: { kind: ProjectionKind; kindVersion: number }[] = [
  { kind: 'result_snapshot', kindVersion: 1 },
  { kind: 'player_history', kindVersion: 1 },
  { kind: 'player_rank', kindVersion: 1 },
]

async function sha256(text: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
}

/** Accepted (committed) versus processing (later stages still running) for the Session done screen. */
async function statusDto(tx: Tx | typeof prisma, finalization: SessionFinalization) {
  const jobs = await tx.projectionJob.findMany({
    where: { sourceFinalizationId: finalization.sessionId },
    select: { kind: true, status: true, attempts: true, lastErrorCode: true },
  })
  return {
    sessionId: finalization.sessionId,
    commandId: finalization.commandId,
    state: finalization.state,
    stage: finalization.stage,
    accepted: !!finalization.committedAt,
    committedAt: toIsoOrNull(finalization.committedAt),
    completedAt: toIsoOrNull(finalization.completedAt),
    failedStage: finalization.failedStage,
    failureCode: finalization.failureCode,
    jobs: jobs.map((j) => ({
      kind: j.kind,
      status: j.status,
      attempts: j.attempts,
      lastErrorCode: j.lastErrorCode,
    })),
  }
}

/**
 * The barriers Session done needs, read under the session lock: completeness proven (every stream
 * sealed and settled, no open conflict), no active match, and an effective ranking policy.
 * Returns what blocks, never a fabricated outcome.
 */
async function barriers(tx: Tx, sessionId: string, now: Date) {
  const [completeness, active, policy] = await Promise.all([
    sessionCompleteness(tx, sessionId),
    tx.match.count({ where: { sessionId, state: 'active' } }),
    tx.rankingPolicyVersion.findFirst({
      where: { effectiveAt: { lte: now } },
      orderBy: [{ effectiveAt: 'desc' }, { version: 'desc' }],
    }),
  ])
  const blocking: string[] = []
  if (active) blocking.push('active_matches')
  if (completeness.openStreams) blocking.push('unsealed_streams')
  if (completeness.openConflicts) blocking.push('open_conflicts')
  if (completeness.pendingOperations) blocking.push('pending_operations')
  if (!policy) blocking.push('no_ranking_policy')
  return { blocking, completeness, activeMatches: active, policy }
}

/**
 * Drops every match that never started. Waiting ones leave the queue; On court ones (placed, never
 * started, so not results) first give up their court and player holds, then go back to waiting and
 * are removed the same way. Court usage is closed with no release operation. Runs inside the
 * Session done transaction, so the courts are free the moment it commits.
 */
async function dropUnstarted(tx: Tx, sessionId: string, now: Date) {
  const placed = await tx.match.findMany({
    where: { sessionId, state: 'on_court', removedAt: null },
    select: { id: true },
  })
  const ids = placed.map((m) => m.id)
  if (ids.length) {
    await tx.matchCourtUsage.updateMany({
      where: { matchId: { in: ids }, releasedAt: null },
      data: { releasedAt: now },
    })
    await tx.activeCourtHold.deleteMany({ where: { matchId: { in: ids } } })
    await tx.activePlayerHold.deleteMany({ where: { matchId: { in: ids } } })
    await tx.match.updateMany({
      where: { id: { in: ids } },
      data: { state: 'waiting', placedAt: null },
    })
  }
  await tx.match.updateMany({
    where: { sessionId, state: 'waiting', removedAt: null },
    data: { removedAt: now, queuePosition: null },
  })
}

/** Q-DONE review: what would block, plus the minimum-games shortfall warning (never a blocker). */
export async function reviewSessionDone(context: ClubContext, sessionId: string) {
  const session = await prisma.queueSession.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: sessionId } },
  })
  if (!session) throw new ServiceError('not_found')
  await requireSessionAccess(context, session)
  return prisma.$transaction(async (tx) => {
    const check = await barriers(tx, sessionId, new Date())
    return {
      blocking: check.blocking,
      activeMatches: check.activeMatches,
      completeness: check.completeness,
      belowMinimum: await belowMinimum(tx, sessionId, session.minimumGames),
    }
  })
}

/**
 * Session game credit after in-game substitutions (QM choice), as `match:entry` keys. `credit_to`
 * sits on the incoming segment: `incoming` gives the game to that entry, `outgoing` to the entry
 * whose segment the same operation closed. The substitute command keeps one choice per team slot.
 * Session counting only (minimum, session summaries); facts keep `fullParticipation` strict, so
 * long-term performance and rank never see it.
 */
function creditedKeys(
  parts: {
    id: string
    matchId: string
    sessionPlayerId: string
    joinedOperationId: string
    leftOperationId: string | null
    creditTo: 'none' | 'incoming' | 'outgoing'
  }[],
) {
  const keys = new Set<string>()
  for (const p of parts) {
    if (p.creditTo === 'incoming') keys.add(`${p.matchId}:${p.sessionPlayerId}`)
    if (p.creditTo !== 'outgoing') continue
    const out = parts.find(
      (o) => o.matchId === p.matchId && o.id !== p.id && o.leftOperationId === p.joinedOperationId,
    )
    if (out) keys.add(`${p.matchId}:${out.sessionPlayerId}`)
  }
  return keys
}

/** Participations of the session's completed matches, with what session credit needs. */
async function completedParticipations(tx: Tx, sessionId: string) {
  return tx.matchParticipation.findMany({
    where: { sessionId, match: { state: 'completed', decision: { kind: 'completed' } } },
    select: {
      id: true,
      sessionPlayerId: true,
      matchId: true,
      startedWithMatch: true,
      finishedWithMatch: true,
      joinedOperationId: true,
      leftOperationId: true,
      creditTo: true,
    },
  })
}

/**
 * Entries with fewer counted games than the target: full games plus games the operator gave them
 * after a substitution. A warning only (Match done ≠ Session done). Invalid matches give nothing.
 */
async function belowMinimum(tx: Tx, sessionId: string, minimumGames: number) {
  if (minimumGames <= 0) return []
  const roster = await tx.sessionPlayer.findMany({ where: { sessionId, releasedAt: null } })
  const games = await countedGamesByEntry(tx, sessionId)
  return roster
    .map((r) => ({ sessionPlayerId: r.id, name: r.nameSnapshot, games: games.get(r.id) ?? 0 }))
    .filter((r) => r.games < minimumGames)
}

/**
 * Counted games per roster entry from the session's completed matches: full games plus games the
 * operator gave after a substitution (the same count as `countedGames` in the data rules). Set games
 * played (#717) stores its adjustment against this number.
 */
export async function countedGamesByEntry(tx: Tx, sessionId: string) {
  const parts = await completedParticipations(tx, sessionId)
  const segments = new Map<string, number>()
  for (const p of parts)
    segments.set(
      `${p.matchId}:${p.sessionPlayerId}`,
      (segments.get(`${p.matchId}:${p.sessionPlayerId}`) ?? 0) + 1,
    )
  const counted = creditedKeys(parts)
  for (const p of parts)
    if (
      p.startedWithMatch &&
      p.finishedWithMatch &&
      segments.get(`${p.matchId}:${p.sessionPlayerId}`) === 1
    )
      counted.add(`${p.matchId}:${p.sessionPlayerId}`)
  const games = new Map<string, number>()
  for (const key of counted) {
    const entryId = key.slice(key.indexOf(':') + 1)
    games.set(entryId, (games.get(entryId) ?? 0) + 1)
  }
  return games
}

/**
 * Builds the authoritative fact rows: one per (completed match, participant), with full
 * participation recomputed from segments (started, finished, one segment). Invalid matches have no
 * decision of kind completed and so produce nothing.
 */
async function buildFacts(tx: Tx, sessionId: string) {
  const matches = await tx.match.findMany({
    where: { sessionId, state: 'completed', decision: { kind: 'completed' } },
    include: { participations: true, decision: true },
    orderBy: { matchNo: 'asc' },
  })
  const entries = new Map(
    (await tx.sessionPlayer.findMany({ where: { sessionId } })).map((e) => [e.id, e]),
  )
  const facts: Prisma.PlayerMatchFactCreateManyInput[] = []
  for (const match of matches) {
    const decision = match.decision
    if (!decision?.winningTeam) continue
    const byPlayer = new Map<string, typeof match.participations>()
    for (const p of match.participations)
      byPlayer.set(p.sessionPlayerId, [...(byPlayer.get(p.sessionPlayerId) ?? []), p])
    const finishers = match.participations.filter((p) => p.finishedWithMatch)
    for (const [entryId, segments] of byPlayer) {
      const entry = entries.get(entryId)
      if (!entry) continue
      if (entry.skillLevelId == null)
        throw new ServiceError('invalid', { roster: `${entry.nameSnapshot} has no level.` })
      const last = segments[segments.length - 1] as (typeof segments)[number]
      const team = last.team
      facts.push({
        clubId: match.clubId,
        sessionId,
        matchId: match.id,
        sessionPlayerId: entryId,
        clubPlayerId: entry.clubPlayerId,
        playerIdAtFinalization: entry.playerIdAtEntry,
        playedAt: match.startedAt ?? match.endedAt ?? decision.confirmedAt,
        format: match.format,
        team,
        winningTeam: decision.winningTeam,
        fullParticipation: segments.length === 1 && last.startedWithMatch && last.finishedWithMatch,
        standardMatch: match.format === 'singles' || match.format === 'doubles',
        skillLevelSnapshotId: entry.skillLevelId,
        partnerEntryIds: finishers
          .filter((p) => p.team === team && p.sessionPlayerId !== entryId)
          .map((p) => p.sessionPlayerId),
        opponentEntryIds: finishers.filter((p) => p.team !== team).map((p) => p.sessionPlayerId),
        teamAScore: decision.teamAScore,
        teamBScore: decision.teamBScore,
        factVersion: FACT_VERSION,
      })
    }
  }
  return facts
}

/**
 * Per-entry session totals from the facts: full games plus credited substitute games (`credited`,
 * `match:entry` keys), so they agree with the session standings. Partial games nobody was given
 * count nothing.
 */
function summaries(
  sessionId: string,
  facts: Prisma.PlayerMatchFactCreateManyInput[],
  credited: Set<string>,
  roster: {
    id: string
    clubId: string
    clubPlayerId: string
    playerIdAtEntry: string | null
    skillLevelId: number | null
  }[],
  now: Date,
) {
  return roster.map((entry) => {
    const full = facts.filter(
      (f) =>
        f.sessionPlayerId === entry.id &&
        (f.fullParticipation || credited.has(`${f.matchId}:${f.sessionPlayerId}`)),
    )
    const wins = full.filter((f) => f.team === f.winningTeam).length
    return {
      clubId: entry.clubId,
      sessionId,
      sessionPlayerId: entry.id,
      clubPlayerId: entry.clubPlayerId,
      playerIdSnapshot: entry.playerIdAtEntry,
      fullGames: full.length,
      standardGames: full.filter((f) => f.standardMatch).length,
      funGames: full.filter((f) => !f.standardMatch).length,
      wins,
      losses: full.length - wins,
      skillLevelSnapshotId: entry.skillLevelId,
      summaryVersion: SUMMARY_VERSION,
      projectedAt: now,
    }
  })
}

/**
 * Q-DONE · Session done, once. One transaction under the session lock checks every barrier, then
 * commits the one `session_finalizations` row (frozen by trigger), the facts, the session
 * summaries, `completed` state, the released offline reservation and the downstream projection
 * jobs. A retry with the same command returns the committed status; another command for an
 * already-finalized session gets the same status and never double-counts. Projection or slide
 * failures retry their jobs without repeating this.
 */
export async function finalizeSession(
  context: ClubContext,
  sessionId: string,
  input: { commandId: string },
) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const session = await lockSession(tx, context, sessionId)
        const existing = await tx.sessionFinalization.findUnique({ where: { sessionId } })
        if (existing)
          return { status: await statusDto(tx, existing), warnings: { belowMinimum: [] } }
        await requireSessionAccess(context, session)
        if (session.state !== 'active')
          throw new ServiceError('invalid', { state: 'Only a running session can be finished.' })
        const now = new Date()
        const check = await barriers(tx, sessionId, now)
        if (check.blocking.length || !check.policy)
          throw new ServiceError('conflict', Object.fromEntries(check.blocking.map((b) => [b, b])))
        const streams = await tx.deviceSessionStream.findMany({
          where: { sessionId, state: 'sealed' },
          orderBy: { id: 'asc' },
        })
        const manifest = streams.map((s) => ({
          streamId: s.id,
          finalSequence: s.sealedFinalSequence?.toString() ?? '0',
          digest: s.sealedDigest ? Buffer.from(s.sealedDigest).toString('hex') : null,
        }))
        const warnings = { belowMinimum: await belowMinimum(tx, sessionId, session.minimumGames) }
        const facts = await buildFacts(tx, sessionId)
        const factsDigest = await sha256(
          JSON.stringify(
            facts
              .map((f) => [
                f.matchId,
                f.sessionPlayerId,
                f.team,
                f.winningTeam,
                f.fullParticipation,
                f.teamAScore,
                f.teamBScore,
              ])
              .sort((a, b) => `${a[0]}${a[1]}`.localeCompare(`${b[0]}${b[1]}`)),
          ),
        )
        const finalization = await tx.sessionFinalization.create({
          data: {
            sessionId,
            clubId: context.clubId,
            commandId: input.commandId,
            state: 'committed',
            stage: 'player_records',
            streamManifest: manifest,
            manifestDigest: await sha256(JSON.stringify(manifest)),
            acceptedSessionRevision: session.revision,
            policyVersionId: check.policy.id,
            startedAt: now,
            committedAt: now,
            factsDigest,
          },
        })
        if (facts.length) await tx.playerMatchFact.createMany({ data: facts })
        const roster = await tx.sessionPlayer.findMany({ where: { sessionId, releasedAt: null } })
        await tx.clubSessionPlayerSummary.createMany({
          data: summaries(
            sessionId,
            facts,
            creditedKeys(await completedParticipations(tx, sessionId)),
            roster,
            now,
          ),
        })
        await dropUnstarted(tx, sessionId, now)
        await tx.queueSession.update({
          where: { id: sessionId },
          data: { state: 'completed', finalizedAt: now, revision: { increment: 1 } },
        })
        await tx.clubSessionReservation.deleteMany({ where: { clubId: context.clubId, sessionId } })
        await tx.projectionJob.create({
          data: {
            kind: 'club_session_summaries',
            kindVersion: SUMMARY_VERSION,
            sourceType: 'finalization',
            sourceFinalizationId: sessionId,
            status: 'done',
            completedAt: now,
          },
        })
        for (const job of FINALIZATION_JOBS)
          await tx.projectionJob.create({
            data: {
              kind: job.kind,
              kindVersion: job.kindVersion,
              sourceType: 'finalization',
              sourceFinalizationId: sessionId,
            },
          })
        return { status: await statusDto(tx, finalization), warnings }
      },
      { timeout: 30_000 },
    )
  } catch (error) {
    if (error instanceof ServiceError) throw error
    // A concurrent Session done lost the PK race: return the winner's committed status.
    if ((error as { code?: string })?.code === 'P2002')
      return {
        status: await readFinalizationStatus(context, sessionId),
        warnings: { belowMinimum: [] },
      }
    mapDatabaseError(error)
  }
}

/** Q-DONE · status after a lost response: recover by session, never by repeating the commit. */
export async function readFinalizationStatus(context: ClubContext, sessionId: string) {
  const finalization = await prisma.sessionFinalization.findUnique({ where: { sessionId } })
  if (!finalization || finalization.clubId !== context.clubId) throw new ServiceError('not_found')
  return statusDto(prisma, finalization)
}

/**
 * Marks the finalization `done` once every downstream job is done, or records the failed stage
 * when a job has failed. Canonical columns are frozen; only state/stage move.
 */
export async function settleFinalization(tx: Tx, sessionId: string) {
  const finalization = await tx.sessionFinalization.findUnique({ where: { sessionId } })
  if (!finalization?.committedAt || finalization.state === 'done') return finalization
  const jobs = await tx.projectionJob.findMany({ where: { sourceFinalizationId: sessionId } })
  const failed = jobs.find((j) => j.status === 'failed')
  if (failed)
    return tx.sessionFinalization.update({
      where: { sessionId },
      data: {
        state: 'failed',
        failedStage: failed.kind === 'result_snapshot' ? 'slides' : 'player_records',
        failureCode: failed.lastErrorCode ?? 'projection_failed',
        revision: { increment: 1 },
      },
    })
  if (jobs.every((j) => j.status === 'done'))
    return tx.sessionFinalization.update({
      where: { sessionId },
      data: {
        state: 'done',
        stage: 'slides',
        failedStage: null,
        failureCode: null,
        completedAt: new Date(),
        revision: { increment: 1 },
      },
    })
  const snapshotDone = jobs.some((j) => j.kind === 'result_snapshot' && j.status === 'done')
  return tx.sessionFinalization.update({
    where: { sessionId },
    data: {
      state: 'committed',
      stage: snapshotDone ? 'slides' : 'player_records',
      failedStage: null,
      failureCode: null,
      revision: { increment: 1 },
    },
  })
}

/**
 * Q-DONE · Mark session invalid. No finalization, facts or official contribution; the reservation
 * is released. Refused while a match is active or after Session done.
 */
export async function invalidateSession(
  context: ClubContext,
  sessionId: string,
  input: { reason: string },
) {
  const reason = input.reason.trim()
  if (!reason) throw new ServiceError('invalid', { reason: 'Say why this session is invalid.' })
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, sessionId)
    if (session.state === 'invalid')
      return { state: 'invalid' as const, invalidReason: session.invalidReason }
    if (session.state === 'completed' || session.state === 'finalizing')
      throw new ServiceError('invalid', { state: 'A finished session can’t be marked invalid.' })
    await requireSessionAccess(context, session)
    if (await tx.match.count({ where: { sessionId, state: 'active' } }))
      throw new ServiceError('conflict', {
        matches: 'Finish or mark invalid every active match first.',
      })
    await tx.match.updateMany({
      where: { sessionId, state: 'waiting', removedAt: null },
      data: { removedAt: new Date(), queuePosition: null },
    })
    await tx.queueSession.update({
      where: { id: sessionId },
      data: { state: 'invalid', invalidReason: reason, revision: { increment: 1 } },
    })
    await tx.clubSessionReservation.deleteMany({ where: { clubId: context.clubId, sessionId } })
    return { state: 'invalid' as const, invalidReason: reason, at: toIso(new Date()) }
  })
}
