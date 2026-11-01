import 'server-only'
import { WINDOW_DAYS } from '@rotra/data/player/rules'
import { createResultSnapshot } from '@rotra/data/session-result/sessionResult.rules'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { PlayerMatchFact, Prisma, ProjectionJob } from '../generated/prisma/client'
import { matchContext } from '../queue/match-store'
import { settleFinalization } from '../queue/finalization'
import { ServiceError } from '../service/errors'
import { toIso, toIsoOrNull } from '../service/serialize'

type Tx = Prisma.TransactionClient

/**
 * Projections from finalization, assessment, attribution and ageing evidence (F07.30). Every job is
 * unique per source + kind + version (partial uniques in SQL), so a retried source contributes once.
 *
 * No rank formula is approved (#247). Until an algorithm version is listed in
 * `APPROVED_RANK_ALGORITHMS`, the rank job records evidence counts, window and eligibility only:
 * numeric rank, level and components stay null (missing, never zero), state stays `provisional` or
 * `needs_reassessment`, and nobody is leaderboard-eligible. Awards use the prototype reference
 * formula, labeled `prototype-reference` in the private snapshot.
 */
export const APPROVED_RANK_ALGORITHMS: ReadonlySet<string> = new Set()

export const MAX_JOB_ATTEMPTS = 8
const DAY = 86_400_000
const backoff = (attempts: number) => Math.min(60 * 60_000, 30_000 * 2 ** attempts)

/** Facts that belong to a player: their own snapshots plus confirmed, unrevoked guest history. */
async function playerFacts(tx: Tx, playerId: string) {
  const attributions = await tx.playerHistoryAttribution.findMany({
    where: { playerId, revokedAt: null },
    select: { clubId: true, clubPlayerId: true },
  })
  const facts = await tx.playerMatchFact.findMany({
    where: {
      OR: [
        { playerIdAtFinalization: playerId },
        ...attributions.map((a) => ({ clubId: a.clubId, clubPlayerId: a.clubPlayerId })),
      ],
    },
    orderBy: [{ playedAt: 'desc' }, { matchId: 'asc' }],
  })
  // One contribution per (match, entry), whichever path found it.
  const seen = new Set<string>()
  return facts.filter((f) => {
    const key = `${f.matchId}:${f.sessionPlayerId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Only full participation in a standard (singles/doubles) match counts toward performance. */
const counts = (f: PlayerMatchFact) => f.fullParticipation && f.standardMatch

/**
 * Recomputes one player's `player_rank_current` from evidence at `now`. The original played date
 * decides the window, so ageing changes eligibility without new games. A stale run (lower input
 * watermark than stored) never overwrites a newer projection.
 */
export async function recomputeRank(tx: Tx, playerId: string, now = new Date()) {
  const policy = await tx.rankingPolicyVersion.findFirst({
    where: { effectiveAt: { lte: now } },
    orderBy: [{ effectiveAt: 'desc' }, { version: 'desc' }],
  })
  if (!policy) throw new ServiceError('unavailable')
  const facts = await playerFacts(tx, playerId)
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * DAY)
  const inWindow = facts.filter((f) => counts(f) && f.playedAt >= windowStart && f.playedAt <= now)
  const lastValid = facts.find(counts)?.playedAt ?? null
  const assessments = await tx.clubAssessment.count({
    where: { playerIdAtAssessment: playerId, assessedAt: { gte: windowStart, lte: now } },
  })
  const oldest = inWindow.reduce<Date | null>((min, f) => (!min || f.playedAt < min ? f.playedAt : min), null)
  const nextRecheckAt = oldest ? new Date(oldest.getTime() + WINDOW_DAYS * DAY) : new Date(now.getTime() + WINDOW_DAYS * DAY)
  const watermark = BigInt(facts.reduce((max, f) => Math.max(max, f.createdAt.getTime()), 0))
  const approved = APPROVED_RANK_ALGORITHMS.has(policy.algorithmVersion)
  const state = lastValid && lastValid < windowStart ? 'needs_reassessment' : 'provisional'
  const data = {
    skillLevelId: null,
    numericRank: null,
    state,
    explanationCode: approved ? 'calculation_pending' : 'formula_pending',
    assessmentComponent: null,
    performanceComponent: null,
    inputCounts: { assessments, recentStandardMatches: inWindow.length, facts: facts.length },
    policyVersionId: policy.id,
    algorithmVersion: policy.algorithmVersion,
    windowStart,
    windowEnd: now,
    calculatedAt: now,
    inputWatermark: watermark,
    nextRecheckAt,
    recentStandardMatchCount: inWindow.length,
    lastValidPlayedAt: lastValid,
    leaderboardEligible: false,
  } as const
  const current = await tx.playerRankCurrent.findUnique({ where: { playerId } })
  if (current && current.inputWatermark > watermark) return current
  return current
    ? tx.playerRankCurrent.update({ where: { playerId }, data: { ...data, revision: { increment: 1 } } })
    : tx.playerRankCurrent.create({ data: { playerId, ...data } })
}

/** The private snapshot for a finalized session: standings, awards and Off Day in its own column. */
async function writeResultSnapshot(tx: Tx, sessionId: string) {
  const existing = await tx.sessionResultSnapshot.findUnique({ where: { sessionId_version: { sessionId, version: 1 } } })
  if (existing) return existing
  const session = await tx.queueSession.findUniqueOrThrow({ where: { id: sessionId } })
  const { ctx } = await matchContext(tx, session)
  const clubPlayers = await tx.clubPlayer.findMany({
    where: { clubId: session.clubId, id: { in: ctx.roster.map((r) => r.clubPlayerId) } },
    select: { id: true, playerId: true },
  })
  // Baseline: each club player's earlier finalized sessions at this club, by full-game win rate.
  const prior = await tx.clubSessionPlayerSummary.findMany({
    where: {
      clubId: session.clubId,
      clubPlayerId: { in: clubPlayers.map((c) => c.id) },
      sessionId: { not: sessionId },
      finalization: { committedAt: { lt: session.finalizedAt ?? new Date() } },
    },
    select: { clubPlayerId: true, sessionId: true, wins: true, fullGames: true },
  })
  const history = clubPlayers.map((c) => {
    const rows = prior.filter((p) => p.clubPlayerId === c.id)
    const games = rows.reduce((n, r) => n + r.fullGames, 0)
    return {
      clubPlayerId: c.id,
      priorSessions: rows.length,
      baselineWinRate: games ? rows.reduce((n, r) => n + r.wins, 0) / games : null,
    }
  })
  const snapshot = createResultSnapshot({
    sessionId,
    roster: ctx.roster,
    matches: ctx.matches,
    history: history as never,
    players: clubPlayers,
    generatedAt: Date.now(),
  })
  const { offDay, ...awards } = snapshot.awards
  return tx.sessionResultSnapshot.create({
    data: {
      clubId: session.clubId,
      sessionId,
      version: 1,
      calculationVersion: snapshot.calculationVersion,
      standings: snapshot.standings as unknown as Prisma.InputJsonValue,
      awards: awards as unknown as Prisma.InputJsonValue,
      offDay: offDay as unknown as Prisma.InputJsonValue,
      baselineSessionIds: [...new Set(prior.map((p) => p.sessionId))],
      generatedAt: new Date(snapshot.generatedAt),
    },
  })
}

async function playersOfFinalization(tx: Tx, sessionId: string) {
  const facts = await tx.playerMatchFact.findMany({
    where: { sessionId, playerIdAtFinalization: { not: null } },
    select: { playerIdAtFinalization: true },
    distinct: ['playerIdAtFinalization'],
  })
  const attributed = await tx.playerHistoryAttribution.findMany({
    where: { revokedAt: null, clubPlayer: { facts: { some: { sessionId } } } },
    select: { playerId: true },
  })
  return [...new Set([...facts.map((f) => f.playerIdAtFinalization as string), ...attributed.map((a) => a.playerId)])]
}

/** Runs one claimed job's work in its own transaction. */
async function runJob(job: ProjectionJob, now: Date) {
  await prisma.$transaction(
    async (tx) => {
      switch (job.kind) {
        case 'result_snapshot':
          if (job.sourceFinalizationId) await writeResultSnapshot(tx, job.sourceFinalizationId)
          break
        case 'player_history':
          // History is read straight from facts; this stage only confirms they are committed.
          if (job.sourceFinalizationId)
            await tx.sessionFinalization.findUniqueOrThrow({ where: { sessionId: job.sourceFinalizationId } })
          break
        case 'player_rank': {
          let targets: string[] = []
          if (job.targetPlayerId) targets = [job.targetPlayerId]
          else if (job.sourceFinalizationId) targets = await playersOfFinalization(tx, job.sourceFinalizationId)
          else if (job.sourceAttributionId)
            targets = [(await tx.playerHistoryAttribution.findUniqueOrThrow({ where: { id: job.sourceAttributionId } })).playerId]
          else if (job.sourceAssessmentId) {
            const a = await tx.clubAssessment.findUniqueOrThrow({ where: { id: job.sourceAssessmentId } })
            if (a.playerIdAtAssessment) targets = [a.playerIdAtAssessment]
          }
          for (const playerId of targets) await recomputeRank(tx, playerId, now)
          break
        }
        default:
          break
      }
      await tx.projectionJob.update({
        where: { id: job.id },
        data: { status: 'done', completedAt: now, lockedAt: null, lastErrorCode: null },
      })
      if (job.sourceFinalizationId) await settleFinalization(tx, job.sourceFinalizationId)
    },
    { timeout: 60_000 },
  )
}

/**
 * The worker loop body (runtime pending #243): claims due jobs with SKIP LOCKED, runs each, and on
 * failure records a redacted error code and a backoff. After `MAX_JOB_ATTEMPTS` the job stays
 * `failed` for the owner to see; its source facts are untouched and a manual retry resumes it.
 */
export async function runProjectionJobs(limit = 10, now = new Date()) {
  const claimed = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "projection_jobs"
      WHERE "status" IN ('pending', 'failed') AND "next_attempt_at" <= ${now} AND "attempts" < ${MAX_JOB_ATTEMPTS}
      ORDER BY "next_attempt_at", "id"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED`
    if (!rows.length) return []
    await tx.projectionJob.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { status: 'running', lockedAt: now, attempts: { increment: 1 } },
    })
    return tx.projectionJob.findMany({ where: { id: { in: rows.map((r) => r.id) } } })
  })
  const results: { id: string; kind: string; status: 'done' | 'failed'; errorCode?: string }[] = []
  for (const job of claimed) {
    try {
      await runJob(job, now)
      results.push({ id: job.id, kind: job.kind, status: 'done' })
    } catch (error) {
      const errorCode =
        error instanceof ServiceError ? error.code : error instanceof Error ? error.name.slice(0, 40) : 'unknown'
      await prisma.$transaction(async (tx) => {
        await tx.projectionJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            lockedAt: null,
            lastErrorCode: errorCode,
            nextAttemptAt: new Date(now.getTime() + backoff(job.attempts)),
          },
        })
        if (job.sourceFinalizationId) await settleFinalization(tx, job.sourceFinalizationId)
      })
      results.push({ id: job.id, kind: job.kind, status: 'failed', errorCode })
    }
  }
  return results
}

/** Releases jobs a crashed worker left `running` past the lease, so they retry. */
export async function releaseStaleJobs(leaseMs = 10 * 60_000, now = new Date()) {
  const { count } = await prisma.projectionJob.updateMany({
    where: { status: 'running', lockedAt: { lt: new Date(now.getTime() - leaseMs) } },
    data: { status: 'pending', lockedAt: null },
  })
  return { released: count }
}

/** Manual retry of a job that ran out of attempts (owner action). */
export async function retryProjectionJob(jobId: string) {
  await prisma.projectionJob.updateMany({
    where: { id: jobId, status: 'failed' },
    data: { status: 'pending', attempts: 0, nextAttemptAt: new Date() },
  })
  return { jobId }
}

/**
 * Ageing: enqueues one rank job per player whose earliest in-window game has aged out. Repeat-safe
 * on (player, due time) through the ageing partial unique.
 */
export async function scheduleAgeingJobs(now = new Date(), limit = 500) {
  const due = await prisma.playerRankCurrent.findMany({
    where: { nextRecheckAt: { lte: now } },
    select: { playerId: true, nextRecheckAt: true },
    take: limit,
  })
  let created = 0
  for (const row of due)
    try {
      await prisma.projectionJob.create({
        data: { kind: 'player_rank', kindVersion: 1, sourceType: 'ageing', targetPlayerId: row.playerId, dueAt: row.nextRecheckAt },
      })
      created++
    } catch (error) {
      if ((error as { code?: string })?.code !== 'P2002') throw error
    }
  return { created }
}

/** A policy save asks every ranked player to be recalculated under it (retroactivity #247). */
export async function schedulePolicyRecalculation(now = new Date()) {
  const { count } = await prisma.playerRankCurrent.updateMany({ data: { nextRecheckAt: now } })
  return { scheduled: count }
}

/**
 * Q-PLAYER · confirmed guest history. Links a club's guest identity to the global player it was
 * confirmed as (RTR ID, QR or phone check; never a name) and enqueues the rank rebuild. Facts keep
 * their original identity snapshot, club and played date. Repeat-safe on `commandId`.
 */
export async function confirmHistoryAttribution(
  context: ClubContext,
  input: { commandId: string; clubPlayerId: string; playerId: string; method: 'rtr-id' | 'qr' | 'phone' },
) {
  if (!['rtr-id', 'qr', 'phone'].includes(input.method))
    throw new ServiceError('invalid', { identity: 'Confirm this player’s identity first.' })
  return prisma.$transaction(async (tx) => {
    const done = await tx.playerHistoryAttribution.findUnique({ where: { sourceCommandId: input.commandId } })
    if (done) {
      if (done.clubId !== context.clubId) throw new ServiceError('not_found')
      return { attributionId: done.id, confirmedAt: toIso(done.confirmedAt) }
    }
    const clubPlayer = await tx.clubPlayer.findUnique({
      where: { clubId_id: { clubId: context.clubId, id: input.clubPlayerId } },
    })
    if (!clubPlayer) throw new ServiceError('not_found')
    if (clubPlayer.playerId !== input.playerId)
      throw new ServiceError('conflict', { identity: 'Link this player’s profile before moving their history.' })
    const active = await tx.playerHistoryAttribution.findFirst({
      where: { clubId: context.clubId, clubPlayerId: clubPlayer.id, revokedAt: null },
    })
    if (active) return { attributionId: active.id, confirmedAt: toIso(active.confirmedAt) }
    const now = new Date()
    const attribution = await tx.playerHistoryAttribution.create({
      data: {
        clubId: context.clubId,
        clubPlayerId: clubPlayer.id,
        playerId: input.playerId,
        confirmedAt: now,
        confirmationEvidence: { version: 1, method: input.method, by: 'club_account' },
        sourceCommandId: input.commandId,
      },
    })
    await tx.projectionJob.create({
      data: { kind: 'player_rank', kindVersion: 1, sourceType: 'attribution', sourceAttributionId: attribution.id },
    })
    return { attributionId: attribution.id, confirmedAt: toIso(now) }
  })
}

/**
 * P-HISTORY public read (`player.match-history`): valid finalized sessions only, grouped by
 * session, with each game's counting status. No costs, levels, Off Day or private identity.
 */
export async function readPlayerMatchHistory(playerId: string) {
  return prisma.$transaction(async (tx) => {
    const facts = await playerFacts(tx, playerId)
    const sessionIds = [...new Set(facts.map((f) => f.sessionId))]
    const [sessions, entries] = await Promise.all([
      tx.queueSession.findMany({
        where: { id: { in: sessionIds }, state: 'completed' },
        select: { id: true, title: true, finalizedAt: true, publicSlug: true, club: { select: { name: true } }, publication: { select: { publishedAt: true } } },
      }),
      tx.sessionPlayer.findMany({
        where: { sessionId: { in: sessionIds } },
        select: { id: true, nameSnapshot: true },
      }),
    ])
    const names = new Map(entries.map((e) => [e.id, e.nameSnapshot]))
    return sessions
      .map((s) => ({
        id: s.id,
        title: s.title,
        clubName: s.club.name,
        finishedAt: toIsoOrNull(s.finalizedAt),
        sessionPageUrl: s.publication?.publishedAt ? `/s/${s.publicSlug}` : null,
        games: facts
          .filter((f) => f.sessionId === s.id)
          .map((f) => ({
            id: f.matchId,
            format: f.format,
            partners: f.partnerEntryIds.map((id) => names.get(id) ?? ''),
            opponents: f.opponentEntryIds.map((id) => names.get(id) ?? ''),
            counting: !f.fullParticipation ? 'partial' : f.standardMatch ? 'counted' : 'fun',
            result: f.team === f.winningTeam ? 'won' : 'lost',
            score:
              f.teamAScore == null || f.teamBScore == null
                ? null
                : f.team === 'A'
                  ? `${f.teamAScore}–${f.teamBScore}`
                  : `${f.teamBScore}–${f.teamAScore}`,
          })),
      }))
      .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))
  })
}

/** P-RANK public read: the projection as stored, with the effective version that explains it. */
export async function readPlayerRank(playerId: string) {
  const rank = await prisma.playerRankCurrent.findUnique({
    where: { playerId },
    include: { policyVersion: { select: { version: true, recentStandardMatchThreshold: true } } },
  })
  if (!rank) return null
  return {
    playerId,
    state: rank.state,
    level: rank.skillLevelId,
    numericRank: rank.numericRank?.toString() ?? null,
    explanationCode: rank.explanationCode,
    recentCount: rank.recentStandardMatchCount,
    matchRequirement: rank.policyVersion.recentStandardMatchThreshold,
    policyVersion: rank.policyVersion.version,
    algorithmVersion: rank.algorithmVersion,
    leaderboardEligible: rank.leaderboardEligible,
    calculatedAt: toIso(rank.calculatedAt),
    // Truthful pending output: a rank job aimed at this player has not finished yet.
    updatePending:
      (await prisma.projectionJob.count({
        where: { kind: 'player_rank', status: { in: ['pending', 'running', 'failed'] }, targetPlayerId: playerId },
      })) > 0,
  }
}

/** `leaderboard.list`: only eligible rows, highest rank first. Empty until a formula is approved. */
export async function readLeaderboard(limit = 50) {
  const rows = await prisma.playerRankCurrent.findMany({
    where: { leaderboardEligible: true, numericRank: { not: null } },
    orderBy: [{ numericRank: 'desc' }, { playerId: 'asc' }],
    take: limit,
    include: { player: { select: { fullName: true, nickname: true } } },
  })
  return rows.map((r, i) => ({
    position: i + 1,
    playerId: r.playerId,
    fullName: r.player.fullName,
    nickname: r.player.nickname,
    level: r.skillLevelId,
    recentCount: r.recentStandardMatchCount,
    state: r.state,
  }))
}
