import 'server-only'
import { WINDOW_DAYS, yearGameStats } from '@rotra/data/player/rules'
import { maskPublicName } from '@rotra/data/public-session/rules'
import { awardBaseline, createResultSnapshot } from '@rotra/data/session-result/sessionResult.rules'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { type PlayerMatchFact, Prisma, type ProjectionJob } from '../generated/prisma/client'
import { settleFinalization } from '../queue/finalization'
import { matchContext } from '../queue/match-store'
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
/** Public reads take a player ID from the URL; anything that is not a UUID is simply not found. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
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
  const oldest = inWindow.reduce<Date | null>(
    (min, f) => (!min || f.playedAt < min ? f.playedAt : min),
    null,
  )
  const nextRecheckAt = oldest
    ? new Date(oldest.getTime() + WINDOW_DAYS * DAY)
    : new Date(now.getTime() + WINDOW_DAYS * DAY)
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
    ? tx.playerRankCurrent.update({
        where: { playerId },
        data: { ...data, revision: { increment: 1 } },
      })
    : tx.playerRankCurrent.create({ data: { playerId, ...data } })
}

/** The private snapshot for a finalized session: standings, awards and Off Day in its own column. */
async function writeResultSnapshot(tx: Tx, sessionId: string) {
  const existing = await tx.sessionResultSnapshot.findUnique({
    where: { sessionId_version: { sessionId, version: 1 } },
  })
  if (existing) return existing
  const session = await tx.queueSession.findUniqueOrThrow({ where: { id: sessionId } })
  const { ctx } = await matchContext(tx, session)
  const clubPlayers = await tx.clubPlayer.findMany({
    where: { clubId: session.clubId, id: { in: ctx.roster.map((r) => r.clubPlayerId) } },
    select: { id: true, playerId: true },
  })
  // Baseline: each club player's earlier finalized sessions at this club, by FULL-game win rate.
  // Session summaries count credited substitute games, so the rate is read from the facts, whose
  // `fullParticipation` never includes them (owner decision, November 6, 2026).
  const prior = await tx.clubSessionPlayerSummary.findMany({
    where: {
      clubId: session.clubId,
      clubPlayerId: { in: clubPlayers.map((c) => c.id) },
      sessionId: { not: sessionId },
      finalization: { committedAt: { lt: session.finalizedAt ?? new Date() } },
    },
    select: { clubPlayerId: true, sessionId: true },
  })
  const priorFacts = prior.length
    ? await tx.playerMatchFact.findMany({
        where: {
          clubId: session.clubId,
          clubPlayerId: { in: clubPlayers.map((c) => c.id) },
          sessionId: { in: [...new Set(prior.map((p) => p.sessionId))] },
          fullParticipation: true,
        },
        select: {
          clubPlayerId: true,
          sessionId: true,
          fullParticipation: true,
          team: true,
          winningTeam: true,
        },
      })
    : []
  const history = awardBaseline(
    clubPlayers.map((c) => c.id),
    prior,
    priorFacts,
  )
  const snapshot = createResultSnapshot({
    sessionId,
    roster: ctx.roster,
    matches: ctx.matches,
    history,
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
  return [
    ...new Set([
      ...facts.map((f) => f.playerIdAtFinalization as string),
      ...attributed.map((a) => a.playerId),
    ]),
  ]
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
            await tx.sessionFinalization.findUniqueOrThrow({
              where: { sessionId: job.sourceFinalizationId },
            })
          break
        case 'player_rank': {
          let targets: string[] = []
          if (job.targetPlayerId) targets = [job.targetPlayerId]
          else if (job.sourceFinalizationId)
            targets = await playersOfFinalization(tx, job.sourceFinalizationId)
          else if (job.sourceAttributionId)
            targets = [
              (
                await tx.playerHistoryAttribution.findUniqueOrThrow({
                  where: { id: job.sourceAttributionId },
                })
              ).playerId,
            ]
          else if (job.sourceAssessmentId) {
            const a = await tx.clubAssessment.findUniqueOrThrow({
              where: { id: job.sourceAssessmentId },
            })
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
export async function runProjectionJobs(
  limit = 10,
  now = new Date(),
  scope: { sessionId?: string } = {},
) {
  const claimed = await prisma.$transaction(async (tx) => {
    const session = scope.sessionId
      ? Prisma.sql`AND "source_finalization_id" = ${scope.sessionId}::uuid`
      : Prisma.empty
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "projection_jobs"
      WHERE "status" IN ('pending', 'failed') AND "next_attempt_at" <= ${now} AND "attempts" < ${MAX_JOB_ATTEMPTS}
      ${session}
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
        error instanceof ServiceError
          ? error.code
          : error instanceof Error
            ? error.name.slice(0, 40)
            : 'unknown'
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
export async function releaseStaleJobs(
  leaseMs = 10 * 60_000,
  now = new Date(),
  scope: { sessionId?: string } = {},
) {
  const { count } = await prisma.projectionJob.updateMany({
    where: {
      status: 'running',
      lockedAt: { lt: new Date(now.getTime() - leaseMs) },
      ...(scope.sessionId ? { sourceFinalizationId: scope.sessionId } : {}),
    },
    data: { status: 'pending', lockedAt: null },
  })
  return { released: count }
}

/** How many claim rounds one request may run; each round claims only this session's due jobs. */
const IN_REQUEST_ROUNDS = 3

/**
 * Interim in-request worker (worker hosting is open, #243). Drives one committed finalization's
 * own jobs (`result_snapshot`, `player_history`, `player_rank`) as far as they go now, so Session
 * done reaches `done` without a hosted worker. Bounded: a few claim rounds, only this session's
 * jobs, only due ones. Idempotent: jobs are unique per source + kind + version and claimed with
 * SKIP LOCKED, so concurrent or repeated calls never double-run a job. `retryFailed` (an explicit
 * Try again) makes this session's failed jobs due now; one that used up `MAX_JOB_ATTEMPTS` stays
 * failed for the owner's `retryProjectionJob`. A job left `running` by a lost request is released
 * after the usual lease. No finalization, another club's, or one already done is a no-op.
 */
export async function driveFinalizationJobs(
  context: ClubContext,
  sessionId: string,
  options: { retryFailed?: boolean } = {},
) {
  const finalization = await prisma.sessionFinalization.findUnique({ where: { sessionId } })
  if (!finalization?.committedAt || finalization.clubId !== context.clubId) return []
  if (finalization.state === 'done') return []
  if (options.retryFailed)
    await prisma.projectionJob.updateMany({
      where: {
        sourceFinalizationId: sessionId,
        status: 'failed',
        attempts: { lt: MAX_JOB_ATTEMPTS },
      },
      data: { nextAttemptAt: new Date() },
    })
  await releaseStaleJobs(undefined, new Date(), { sessionId })
  const ran: Awaited<ReturnType<typeof runProjectionJobs>> = []
  for (let round = 0; round < IN_REQUEST_ROUNDS; round++) {
    const results = await runProjectionJobs(10, new Date(), { sessionId })
    ran.push(...results)
    if (!results.length || results.every((r) => r.status === 'failed')) break
  }
  return ran
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
        data: {
          kind: 'player_rank',
          kindVersion: 1,
          sourceType: 'ageing',
          targetPlayerId: row.playerId,
          dueAt: row.nextRecheckAt,
        },
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
  input: {
    commandId: string
    clubPlayerId: string
    playerId: string
    method: 'rtr-id' | 'qr' | 'phone'
  },
) {
  if (!['rtr-id', 'qr', 'phone'].includes(input.method))
    throw new ServiceError('invalid', { identity: 'Confirm this player’s identity first.' })
  return prisma.$transaction(async (tx) => {
    const done = await tx.playerHistoryAttribution.findUnique({
      where: { sourceCommandId: input.commandId },
    })
    if (done) {
      if (done.clubId !== context.clubId) throw new ServiceError('not_found')
      return { attributionId: done.id, confirmedAt: toIso(done.confirmedAt) }
    }
    const clubPlayer = await tx.clubPlayer.findUnique({
      where: { clubId_id: { clubId: context.clubId, id: input.clubPlayerId } },
    })
    if (!clubPlayer) throw new ServiceError('not_found')
    if (clubPlayer.playerId !== input.playerId)
      throw new ServiceError('conflict', {
        identity: 'Link this player’s profile before moving their history.',
      })
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
      data: {
        kind: 'player_rank',
        kindVersion: 1,
        sourceType: 'attribution',
        sourceAttributionId: attribution.id,
      },
    })
    return { attributionId: attribution.id, confirmedAt: toIso(now) }
  })
}

/**
 * One person on a game court (`PlayerGamePlayer`): the entry's name snapshot, the ROTRA player's
 * picture reference (a photo URL or `character:<id>`; the client resolves it) and player ID. A
 * guest or unclaimed record (no profile with an RTR ID) has no picture and no player ID; their name
 * shows as it always has on game rows. With `maskAlwaysPrivate`, an always-private player
 * (D-2026-11-12-01) shows a masked name; their picture and player ID stay, as on the leaderboard.
 */
type CourtEntry = {
  nameSnapshot: string
  playerAtEntry: {
    id: string
    avatarRef: string | null
    profileVisibility: string
    idAllocation: { rtrId: string } | null
  } | null
}
function courtPlayer(
  entry: CourtEntry | undefined,
  maskAlwaysPrivate: boolean,
): { name: string; picture: string | null; playerId: string | null } {
  if (!entry) return { name: '', picture: null, playerId: null }
  const player = entry.playerAtEntry
  if (!player?.idAllocation) return { name: entry.nameSnapshot, picture: null, playerId: null }
  return {
    name:
      maskAlwaysPrivate && player.profileVisibility === 'always_private'
        ? maskPublicName(entry.nameSnapshot)
        : entry.nameSnapshot,
    picture: player.avatarRef ?? null,
    playerId: player.id,
  }
}

/**
 * P-HISTORY public read (`player.match-history`): valid finalized sessions only, grouped by
 * session, with each game's counting status and the faces on its court (`partnerPlayers` /
 * `opponentPlayers`, in the order of `partners` / `opponents`). No costs, levels, Off Day or
 * private identity; always-private players are masked unless `maskAlwaysPrivate` is false (Admin).
 */
async function historyFromFacts(tx: Tx, facts: PlayerMatchFact[], maskAlwaysPrivate = true) {
  const sessionIds = [...new Set(facts.map((f) => f.sessionId))]
  const [sessions, entries] = await Promise.all([
    tx.queueSession.findMany({
      where: { id: { in: sessionIds }, state: 'completed' },
      select: {
        id: true,
        title: true,
        finalizedAt: true,
        publicSlug: true,
        club: { select: { name: true } },
        publication: { select: { publishedAt: true } },
      },
    }),
    tx.sessionPlayer.findMany({
      where: { sessionId: { in: sessionIds } },
      select: {
        id: true,
        nameSnapshot: true,
        playerAtEntry: {
          select: {
            id: true,
            avatarRef: true,
            profileVisibility: true,
            idAllocation: { select: { rtrId: true } },
          },
        },
      },
    }),
  ])
  const byId = new Map(entries.map((e) => [e.id, e]))
  const people = (ids: string[]) => ids.map((id) => courtPlayer(byId.get(id), maskAlwaysPrivate))
  return sessions
    .map((s) => ({
      id: s.id,
      title: s.title,
      clubName: s.club.name,
      finishedAt: toIsoOrNull(s.finalizedAt),
      sessionPageUrl: s.publication?.publishedAt ? `/s/${s.publicSlug}` : null,
      games: facts
        .filter((f) => f.sessionId === s.id)
        .map((f) => {
          const partnerPlayers = people(f.partnerEntryIds)
          const opponentPlayers = people(f.opponentEntryIds)
          return {
            id: f.matchId,
            format: f.format,
            partners: partnerPlayers.map((p) => p.name),
            opponents: opponentPlayers.map((p) => p.name),
            partnerPlayers,
            opponentPlayers,
            counting: !f.fullParticipation ? 'partial' : f.standardMatch ? 'counted' : 'fun',
            result: f.team === f.winningTeam ? 'won' : 'lost',
            score:
              f.teamAScore == null || f.teamBScore == null
                ? null
                : f.team === 'A'
                  ? `${f.teamAScore}–${f.teamBScore}`
                  : `${f.teamBScore}–${f.teamAScore}`,
          }
        }),
    }))
    .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))
}

/** `maskAlwaysPrivate: false` only behind the Admin account boundary (A-PLAYER games). */
export async function readPlayerMatchHistory(playerId: string, { maskAlwaysPrivate = true } = {}) {
  if (!UUID.test(playerId)) return []
  return prisma.$transaction(async (tx) =>
    historyFromFacts(tx, await playerFacts(tx, playerId), maskAlwaysPrivate),
  )
}

/** Admin history for a club-only unclaimed record, scoped to that club's existing match facts. */
export async function readClubPlayerMatchHistory(clubId: string, clubPlayerId: string) {
  if (!UUID.test(clubId) || !UUID.test(clubPlayerId)) return []
  return prisma.$transaction(async (tx) => {
    const facts = await tx.playerMatchFact.findMany({
      where: { clubId, clubPlayerId },
      orderBy: [{ playedAt: 'desc' }, { matchId: 'asc' }],
    })
    return historyFromFacts(tx, facts, false)
  })
}

/**
 * P-RANK public read (`player.public-profile`), shaped as `PlayerRank`: the projection exactly as
 * stored. `levelIndex` is the stored level's display order and stays null until an approved
 * algorithm writes one (#247); nothing is synthesized from counts or club levels. `position` is
 * null (ordering belongs to the leaderboard read). `olderCount` is the player's counted standard
 * matches outside the stored window. `updatePending` names the latest finalized session of theirs
 * whose rank job has not finished; a job with no session behind it (ageing, attribution,
 * assessment) has no session to name and is not reported. No RTR ID or no stored projection is
 * null (no rank yet).
 */
export async function readPlayerRank(playerId: string) {
  if (!UUID.test(playerId)) return null
  return prisma.$transaction(async (tx) => {
    const rank = await tx.playerRankCurrent.findUnique({
      where: { playerId },
      include: {
        skillLevel: { select: { displayOrder: true } },
        player: {
          select: { fullName: true, nickname: true, idAllocation: { select: { rtrId: true } } },
        },
      },
    })
    if (!rank) {
      // A public profile with no rank row yet (e.g. just registered): "no rank yet", not "not found".
      const player = await tx.player.findUnique({
        where: { id: playerId },
        select: { fullName: true, nickname: true, idAllocation: { select: { rtrId: true } } },
      })
      if (!player?.idAllocation) return null
      return {
        playerId,
        fullName: player.fullName,
        nickname: player.nickname,
        levelIndex: null,
        state: 'provisional' as const,
        updatePending: null,
        position: null,
        recentCount: 0,
        olderCount: 0,
      }
    }
    if (!rank.player.idAllocation) return null
    const facts = await playerFacts(tx, playerId)
    const jobs = await tx.projectionJob.findMany({
      where: {
        kind: 'player_rank',
        status: { in: ['pending', 'running', 'failed'] },
        sourceFinalizationId: { in: [...new Set(facts.map((f) => f.sessionId))] },
      },
      select: { sourceFinalizationId: true },
    })
    const pending = jobs.length
      ? await tx.queueSession.findFirst({
          where: { id: { in: jobs.map((j) => j.sourceFinalizationId as string) } },
          orderBy: [{ finalizedAt: 'desc' }, { id: 'asc' }],
          select: { title: true, finalizedAt: true, club: { select: { name: true } } },
        })
      : null
    return {
      playerId,
      fullName: rank.player.fullName,
      nickname: rank.player.nickname,
      levelIndex: rank.skillLevel?.displayOrder ?? null,
      state: rank.state,
      updatePending: pending
        ? {
            sessionTitle: pending.title,
            clubName: pending.club.name,
            finishedAt: toIsoOrNull(pending.finalizedAt) ?? '',
          }
        : null,
      position: null,
      recentCount: rank.recentStandardMatchCount,
      olderCount: Math.max(0, facts.filter(counts).length - rank.recentStandardMatchCount),
    }
  })
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

/**
 * Stats · last 90 days on the session page's participant profile card (#731), by RTR ID: games,
 * wins, losses and win rate from the public match history over the rank window; null without
 * games. Always private (#715) has no column yet, so no profile is refused here.
 */
export async function readRecentGameStatsByRtrId(rtrId: string) {
  const allocation = await prisma.playerIdAllocation.findUnique({
    where: { rtrId: rtrId.trim().toUpperCase() },
    select: { playerId: true },
  })
  if (!allocation) throw new ServiceError('not_found')
  return yearGameStats(await readPlayerMatchHistory(allocation.playerId), Date.now())
}
