import 'server-only'
import { allPlayers, completeLineup, matchStatus } from '@rotra/data/match/match.rules'
import {
  balanceTeams,
  formatForSelection,
  generateMatches,
  suggestionReason,
} from '@rotra/data/match/queue.rules'
import type { MatchLineup, MatchOrigin } from '@rotra/data/match/types'
import type { QueueSession as SessionView } from '@rotra/data/queue-session/types'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { QueueSession } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { toDecimalString } from '../service/serialize'
import {
  loadMatch,
  type MatchRow,
  matchCommand,
  matchContext,
  matchDto,
  nextMatchNo,
  nextQueuePosition,
  sessionMatches,
} from './match-store'
import { derivedId, requireSessionAccess, type Tx } from './session-store'

/** Operator-selected Auto queue batch sizes (Q-QUEUE). */
export const AUTO_QUEUE_SIZES = [2, 3, 4, 6] as const

/** Deterministic per command, so a recomputed suggestion for the same operation is the same. */
function seededRng(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h = (h + 0x6d2b79f5) | 0
    let t = Math.imul(h ^ (h >>> 15), 1 | h)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function sessionView(session: QueueSession): SessionView {
  return {
    ...session,
    notes: session.notes ?? '',
    venueId: session.venueId ?? '',
    venueName: session.venueName ?? '',
    venueAddress: session.venueAddress ?? '',
    scheduledStartAt: session.scheduledStartAt.getTime(),
    scheduledEndAt: session.scheduledEndAt.getTime(),
    startedAt: session.startedAt?.getTime() ?? null,
    finalizedAt: session.finalizedAt?.getTime() ?? null,
    playerRecordsUpdatedAt: null,
  } as unknown as SessionView
}

/** Every slot filled by a different live roster entry; formats switched off are refused. */
function validateLineup(
  session: QueueSession,
  rosterIds: Set<string>,
  lineup: MatchLineup,
  manual: boolean,
) {
  if (!completeLineup(lineup) || allPlayers(lineup).some((id) => !rosterIds.has(id)))
    throw new ServiceError('invalid', { lineup: 'Fill every slot with a different roster player.' })
  if (lineup.format === 'singles' && !session.allowSingles)
    throw new ServiceError('invalid', { format: 'singles is off for this session' })
  if (lineup.format === 'doubles' && !session.allowDoubles)
    throw new ServiceError('invalid', { format: 'doubles is off for this session' })
  if (!manual && lineup.format.startsWith('fun_'))
    throw new ServiceError('invalid', { format: 'Add a fun game manually instead.' })
}

async function writeLineup(
  tx: Tx,
  match: { id: string; clubId: string; sessionId: string },
  lineup: MatchLineup,
  operationId: string,
  now: Date,
) {
  const rows = [
    ...lineup.teamA.map((id) => ({ id, team: 'A' as const })),
    ...lineup.teamB.map((id) => ({ id, team: 'B' as const })),
  ]
  for (const row of rows)
    await tx.matchParticipation.create({
      data: {
        id: await derivedId(operationId, `${match.id}:${row.id}`),
        clubId: match.clubId,
        sessionId: match.sessionId,
        matchId: match.id,
        sessionPlayerId: row.id,
        team: row.team,
        segmentNo: 1,
        joinedOperationId: operationId,
        joinedAt: now,
      },
    })
}

/**
 * Appends one waiting match with the next immutable match number. Repeat-safe on the operation:
 * a retry returns the stored match and never renumbers or duplicates it.
 */
async function appendMatch(
  tx: Tx,
  session: QueueSession,
  rosterIds: Set<string>,
  lineup: MatchLineup,
  input: {
    operationId: string
    origin: MatchOrigin
    manualProtected: boolean
    generationId?: string
    position?: bigint
  },
) {
  const existing = await tx.match.findUnique({ where: { sourceOperationId: input.operationId } })
  if (existing) {
    if (existing.sessionId !== session.id) throw new ServiceError('conflict')
    return (await loadMatch(tx, session.id, existing.id)) as MatchRow
  }
  validateLineup(session, rosterIds, lineup, input.origin === 'manual')
  const now = new Date()
  const match = await tx.match.create({
    data: {
      id: await derivedId(input.operationId, 'match'),
      clubId: session.clubId,
      sessionId: session.id,
      matchNo: await nextMatchNo(tx, session.id),
      format: lineup.format,
      queuePosition: input.position ?? (await nextQueuePosition(tx, session.id)),
      origin: input.origin,
      manualProtected: input.manualProtected,
      generationId: input.generationId ?? null,
      sourceOperationId: input.operationId,
    },
  })
  await writeLineup(tx, match, lineup, input.operationId, now)
  return (await loadMatch(tx, session.id, match.id)) as MatchRow
}

async function waitingMatch(tx: Tx, sessionId: string, matchId: string) {
  const match = await loadMatch(tx, sessionId, matchId)
  if (!match || match.removedAt) throw new ServiceError('not_found')
  if (match.state !== 'waiting')
    throw new ServiceError('invalid', { match: 'Only a waiting match can be changed.' })
  return match
}

/** Q-QUEUE read: matches in number order with the queue revision the screen sends back. */
export async function readSessionMatches(context: ClubContext, sessionId: string) {
  const session = await prisma.queueSession.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: sessionId } },
  })
  if (!session) throw new ServiceError('not_found')
  await requireSessionAccess(context, session)
  const rows = await prisma.$transaction((tx) => sessionMatches(tx, sessionId))
  return { matches: rows.map(matchDto), queueRevision: toDecimalString(session.queueRevision) }
}

/** Q-QUEUE · Add match (manual lineup). Manual entries are protected from regeneration. */
export async function addManualMatch(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; lineup: MatchLineup },
) {
  return matchCommand(context, sessionId, {}, async (tx, session) => {
    const { roster } = await matchContext(tx, session)
    const row = await appendMatch(tx, session, new Set(roster.map((r) => r.id)), input.lineup, {
      operationId: input.operationId,
      origin: 'manual',
      manualProtected: true,
    })
    return matchDto(row)
  })
}

/** Q-QUEUE · Make match from a selection of 2, 3, 4, 6, 8 or 10 players. */
export async function makeMatch(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; selection: string[] },
) {
  return matchCommand(context, sessionId, {}, async (tx, session) => {
    const { ctx, roster } = await matchContext(tx, session)
    const plan = formatForSelection(input.selection.length, session)
    if (!plan.format) throw new ServiceError('invalid', { selection: plan.reason })
    const selected = input.selection.map((id) => ctx.roster.find((p) => p.id === id))
    if (selected.some((p) => !p))
      throw new ServiceError('invalid', { selection: 'Player not available.' })
    const lineup = balanceTeams(
      selected.filter((p): p is NonNullable<typeof p> => !!p),
      plan.format,
    )
    const row = await appendMatch(tx, session, new Set(roster.map((r) => r.id)), lineup, {
      operationId: input.operationId,
      origin: 'manual',
      manualProtected: true,
    })
    return matchDto(row)
  })
}

/**
 * Q-QUEUE · Suggest: computes one lineup without writing. The returned queue revision must be
 * sent back with `addSuggestedMatch`, so a suggestion is never committed against changed inputs.
 */
export async function suggestMatch(context: ClubContext, sessionId: string, seed: string) {
  const session = await prisma.queueSession.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: sessionId } },
  })
  if (!session) throw new ServiceError('not_found')
  await requireSessionAccess(context, session)
  if (session.state !== 'active')
    throw new ServiceError('invalid', { state: 'Start the session first.' })
  return prisma.$transaction(async (tx) => {
    const { ctx } = await matchContext(tx, session)
    const result = generateMatches(
      sessionView(session),
      ctx.roster,
      ctx.matches,
      1,
      seededRng(seed),
    )
    if (result.error) throw new ServiceError('invalid', { suggest: result.error })
    const lineup = result.matches[0] as MatchLineup
    return {
      lineup,
      reason: suggestionReason(lineup, sessionView(session), ctx.roster, ctx.matches),
      queueRevision: toDecimalString(session.queueRevision),
      revision: toDecimalString(session.revision),
    }
  })
}

/** Adds an accepted suggestion. `switched` (operator changed it) protects it like a manual entry. */
export async function addSuggestedMatch(
  context: ClubContext,
  sessionId: string,
  input: {
    operationId: string
    lineup: MatchLineup
    switched: boolean
    expectedQueueRevision: string
    expectedRevision: string
  },
) {
  return matchCommand(
    context,
    sessionId,
    {
      expectedQueueRevision: input.expectedQueueRevision,
      expectedRevision: input.expectedRevision,
    },
    async (tx, session) => {
      const { roster } = await matchContext(tx, session)
      const row = await appendMatch(tx, session, new Set(roster.map((r) => r.id)), input.lineup, {
        operationId: input.operationId,
        origin: 'suggested',
        manualProtected: input.switched,
      })
      return matchDto(row)
    },
  )
}

async function generationRows(tx: Tx, sessionId: string, generationId: string) {
  return tx.match.findMany({
    where: { sessionId, generationId },
    include: { participations: true, courtHolds: true, courtUsage: true, decision: true },
    orderBy: { matchNo: 'asc' },
  })
}

/** Q-QUEUE · Auto queue: appends the operator's chosen batch (2, 3, 4 or 6) of generated matches. */
export async function autoQueue(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; n: number; expectedQueueRevision: string },
) {
  if (!(AUTO_QUEUE_SIZES as readonly number[]).includes(input.n))
    throw new ServiceError('invalid', { n: 'Choose 2, 3, 4 or 6 matches.' })
  return matchCommand(context, sessionId, {}, async (tx, session) => {
    const done = await generationRows(tx, session.id, input.operationId)
    if (done.length) return done.map((row) => matchDto(row as MatchRow))
    if (session.queueRevision.toString() !== input.expectedQueueRevision)
      throw new ServiceError('conflict')
    const { ctx, roster } = await matchContext(tx, session)
    const result = generateMatches(
      sessionView(session),
      ctx.roster,
      ctx.matches,
      input.n,
      seededRng(input.operationId),
    )
    if (result.error) throw new ServiceError('invalid', { queue: result.error })
    const ids = new Set(roster.map((r) => r.id))
    const out = []
    for (const [i, lineup] of result.matches.entries())
      out.push(
        matchDto(
          await appendMatch(tx, session, ids, lineup, {
            operationId: await derivedId(input.operationId, `auto:${i}`),
            origin: 'auto',
            manualProtected: false,
            generationId: input.operationId,
          }),
        ),
      )
    return out
  })
}

/**
 * Q-QUEUE · Regenerate. Rebuilds only waiting auto/suggested drafts and manual entries that need
 * attention; healthy manual entries and active matches are untouched. Replaced drafts are marked
 * removed (their numbers are never reused); new drafts take the replaced queue positions.
 */
export async function regenerateQueue(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; expectedQueueRevision: string },
) {
  return matchCommand(context, sessionId, {}, async (tx, session) => {
    const done = await generationRows(tx, session.id, input.operationId)
    if (done.length) return done.map((row) => matchDto(row as MatchRow))
    if (session.queueRevision.toString() !== input.expectedQueueRevision)
      throw new ServiceError('conflict')
    const { ctx, roster } = await matchContext(tx, session)
    const replace = ctx.matches
      .filter(
        (m) =>
          m.state === 'waiting' &&
          (!m.manualProtected || matchStatus(m, ctx).kind === 'needs-attention'),
      )
      .sort((a, b) => a.queuePosition - b.queuePosition)
    if (!replace.length)
      throw new ServiceError('invalid', { queue: 'There are no waiting matches to rebuild.' })
    const now = new Date()
    await tx.match.updateMany({
      where: { id: { in: replace.map((m) => m.id) }, state: 'waiting' },
      data: { removedAt: now, queuePosition: null, revision: { increment: 1 } },
    })
    const kept = ctx.matches.filter((m) => !replace.some((r) => r.id === m.id))
    const result = generateMatches(
      sessionView(session),
      ctx.roster,
      kept,
      replace.length,
      seededRng(input.operationId),
    )
    if (result.error) throw new ServiceError('invalid', { queue: result.error })
    const ids = new Set(roster.map((r) => r.id))
    const out = []
    for (const [i, lineup] of result.matches.entries())
      out.push(
        matchDto(
          await appendMatch(tx, session, ids, lineup, {
            operationId: await derivedId(input.operationId, `regen:${i}`),
            origin: 'auto',
            manualProtected: false,
            generationId: input.operationId,
            position: BigInt(replace[i]?.queuePosition ?? 0) || undefined,
          }),
        ),
      )
    return out
  })
}

/** Q-QUEUE · reorder. Renumbers queue positions only; match numbers never change. */
export async function moveMatch(
  context: ClubContext,
  sessionId: string,
  input: { matchId: string; toIndex: number; expectedQueueRevision: string },
) {
  if (!Number.isInteger(input.toIndex))
    throw new ServiceError('invalid', { position: 'Choose a queue position.' })
  return matchCommand(
    context,
    sessionId,
    { expectedQueueRevision: input.expectedQueueRevision },
    async (tx, session) => {
      const match = await waitingMatch(tx, session.id, input.matchId)
      const list = await tx.match.findMany({
        where: { sessionId: session.id, state: 'waiting', removedAt: null },
        orderBy: [{ queuePosition: 'asc' }, { matchNo: 'asc' }],
        select: { id: true },
      })
      const from = list.findIndex((m) => m.id === match.id)
      const to = Math.max(0, Math.min(list.length - 1, input.toIndex))
      const [moved] = list.splice(from, 1)
      if (moved) list.splice(to, 0, moved)
      for (const [i, m] of list.entries())
        await tx.match.update({ where: { id: m.id }, data: { queuePosition: BigInt(i + 1) } })
      return { matchId: match.id, position: to + 1 }
    },
  )
}

/** Q-QUEUE · edit lineup or switch sides. The edited entry becomes manual and protected. */
export async function updateWaitingLineup(
  context: ClubContext,
  sessionId: string,
  input: {
    operationId: string
    matchId: string
    lineup: MatchLineup
    expectedQueueRevision: string
  },
) {
  return matchCommand(
    context,
    sessionId,
    { expectedQueueRevision: input.expectedQueueRevision },
    async (tx, session) => {
      const match = await waitingMatch(tx, session.id, input.matchId)
      const { roster } = await matchContext(tx, session)
      validateLineup(session, new Set(roster.map((r) => r.id)), input.lineup, true)
      await tx.matchParticipation.deleteMany({ where: { matchId: match.id } })
      await writeLineup(tx, match, input.lineup, input.operationId, new Date())
      await tx.match.update({
        where: { id: match.id },
        data: {
          format: input.lineup.format,
          origin: 'manual',
          manualProtected: true,
          revision: { increment: 1 },
        },
      })
      return matchDto((await loadMatch(tx, session.id, match.id)) as MatchRow)
    },
  )
}

/** Q-QUEUE · Remove waiting match. Kept as a removed draft so its number is never reused. */
export async function removeWaitingMatch(
  context: ClubContext,
  sessionId: string,
  input: { matchId: string; expectedQueueRevision?: string },
) {
  return matchCommand(
    context,
    sessionId,
    { expectedQueueRevision: input.expectedQueueRevision },
    async (tx, session) => {
      const match = await loadMatch(tx, session.id, input.matchId)
      if (!match) throw new ServiceError('not_found')
      if (match.removedAt) return null
      if (match.state !== 'waiting')
        throw new ServiceError('invalid', { match: 'Only a waiting match can be changed.' })
      await tx.match.update({
        where: { id: match.id },
        data: { removedAt: new Date(), queuePosition: null, revision: { increment: 1 } },
      })
      return null
    },
  )
}
