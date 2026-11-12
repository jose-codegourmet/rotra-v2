import 'server-only'
import { AUTO_QUEUE_MODES, autoQueueDraftConflict } from '@rotra/data/match/auto-queue-rules'
import type { AutoQueueMode } from '@rotra/data/match/auto-queue-types'
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
import { requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { toDecimalString } from '../service/serialize'
import {
  type AutoFillOptions,
  type AutoPlaced,
  autoFillCourts,
  withAutoPlaced,
} from './match-control'
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
export async function appendMatch(
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
  return {
    matches: rows.map(matchDto),
    queueRevision: toDecimalString(session.queueRevision),
    // The session revision the same read saw; an accepted suggestion sends both back.
    revision: toDecimalString(session.revision),
  }
}

const FORMATS: MatchLineup['format'][] = [
  'singles',
  'doubles',
  'fun_1v2',
  'fun_3v3',
  'fun_4v4',
  'fun_5v5',
]

/** A lineup from a request body; anything malformed is `invalid` before the session is locked. */
export function lineupOf(value: unknown): MatchLineup {
  const body = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const ids = (team: unknown) =>
    Array.isArray(team) && team.every((id) => typeof id === 'string') ? (team as string[]) : null
  const format = body.format as MatchLineup['format']
  const teamA = ids(body.teamA)
  const teamB = ids(body.teamB)
  if (!FORMATS.includes(format) || !teamA || !teamB)
    throw new ServiceError('invalid', { lineup: 'Fill every slot with a different roster player.' })
  return { format, teamA, teamB }
}

/** A retried add (its operation already made the match): returns as it was, no Auto Queue. */
const addedAlready = async (tx: Tx, operationId: string) =>
  !!(await tx.match.findUnique({ where: { sourceOperationId: operationId }, select: { id: true } }))

/**
 * Auto Queue after a match is added (Queueing › Auto Queue and Manual Queue): a free open court
 * gets the next eligible match in the same transaction. Never on a repeat or an offline replay.
 */
function fillAfterAdd(
  tx: Tx,
  session: QueueSession,
  operationId: string,
  options: AutoFillOptions,
) {
  return autoFillCourts(tx, session, { ...options, operationId })
}

/** Q-QUEUE · Add match (manual lineup). Manual entries are protected from regeneration. */
export async function addManualMatch(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; lineup: MatchLineup },
  options: AutoFillOptions = {},
) {
  let autoPlaced: AutoPlaced = []
  const done = await matchCommand(context, sessionId, {}, async (tx, session) => {
    const repeat = await addedAlready(tx, input.operationId)
    const { roster } = await matchContext(tx, session)
    const row = await appendMatch(tx, session, new Set(roster.map((r) => r.id)), input.lineup, {
      operationId: input.operationId,
      origin: 'manual',
      manualProtected: true,
    })
    const result = matchDto(row)
    if (!repeat) autoPlaced = await fillAfterAdd(tx, session, input.operationId, options)
    return result
  })
  return withAutoPlaced(done, autoPlaced)
}

/** Q-QUEUE · Make match from a selection of 2, 3, 4, 6, 8 or 10 players. */
/**
 * Make match: the selection decides the format; the operator confirms the teams in pick order or
 * after Arrange to balance, so `lineup` (when sent) must be those same players in that format.
 * Without a lineup the teams are balanced by level.
 */
export async function makeMatch(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; selection: string[]; lineup?: MatchLineup },
  options: AutoFillOptions = {},
) {
  let autoPlaced: AutoPlaced = []
  const done = await matchCommand(context, sessionId, {}, async (tx, session) => {
    const repeat = await addedAlready(tx, input.operationId)
    const { ctx, roster } = await matchContext(tx, session)
    const plan = formatForSelection(input.selection.length, session)
    if (!plan.format) throw new ServiceError('invalid', { selection: plan.reason })
    const selected = input.selection.map((id) => ctx.roster.find((p) => p.id === id))
    if (selected.some((p) => !p))
      throw new ServiceError('invalid', { selection: 'Player not available.' })
    const arranged = input.lineup ? [...input.lineup.teamA, ...input.lineup.teamB] : null
    if (
      input.lineup &&
      arranged &&
      (input.lineup.format !== plan.format ||
        arranged.length !== input.selection.length ||
        new Set(arranged).size !== arranged.length ||
        arranged.some((id) => !input.selection.includes(id)))
    )
      throw new ServiceError('invalid', {
        lineup: 'The lineup no longer matches the selected players.',
      })
    const lineup =
      input.lineup ??
      balanceTeams(
        selected.filter((p): p is NonNullable<typeof p> => !!p),
        plan.format,
      )
    const row = await appendMatch(tx, session, new Set(roster.map((r) => r.id)), lineup, {
      operationId: input.operationId,
      origin: 'manual',
      manualProtected: true,
    })
    const result = matchDto(row)
    if (!repeat) autoPlaced = await fillAfterAdd(tx, session, input.operationId, options)
    return result
  })
  return withAutoPlaced(done, autoPlaced)
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
  options: AutoFillOptions = {},
) {
  let autoPlaced: AutoPlaced = []
  const done = await matchCommand(
    context,
    sessionId,
    {
      expectedQueueRevision: input.expectedQueueRevision,
      expectedRevision: input.expectedRevision,
    },
    async (tx, session) => {
      const repeat = await addedAlready(tx, input.operationId)
      const { roster } = await matchContext(tx, session)
      const row = await appendMatch(tx, session, new Set(roster.map((r) => r.id)), input.lineup, {
        operationId: input.operationId,
        origin: 'suggested',
        manualProtected: input.switched,
      })
      const result = matchDto(row)
      if (!repeat) autoPlaced = await fillAfterAdd(tx, session, input.operationId, options)
      return result
    },
  )
  return withAutoPlaced(done, autoPlaced)
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
  options: AutoFillOptions = {},
) {
  if (!(AUTO_QUEUE_SIZES as readonly number[]).includes(input.n))
    throw new ServiceError('invalid', { n: 'Choose 2, 3, 4 or 6 matches.' })
  let autoPlaced: AutoPlaced = []
  const reply = await matchCommand(context, sessionId, {}, async (tx, session) => {
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
    autoPlaced = await fillAfterAdd(tx, session, input.operationId, options)
    return out
  })
  return withAutoPlaced(reply, autoPlaced)
}

/** At most one full batch (6) from each of the five Auto queue alternatives. */
const MAX_AUTO_QUEUE_DRAFTS = AUTO_QUEUE_MODES.length * 6

type AutoQueueDraftInput = { operationId: string; mode: AutoQueueMode; lineup: MatchLineup }

/** The reviewed drafts from a request body; anything malformed is `invalid` before any lock. */
export function autoQueueDraftsOf(value: unknown): AutoQueueDraftInput[] {
  const drafts = Array.isArray(value) ? value : []
  if (!drafts.length || drafts.length > MAX_AUTO_QUEUE_DRAFTS)
    throw new ServiceError('invalid', { drafts: 'Review a non-empty selection of drafts.' })
  const out = drafts.map((draft): AutoQueueDraftInput => {
    const body = (draft && typeof draft === 'object' ? draft : {}) as Record<string, unknown>
    const mode = body.mode as AutoQueueMode
    if (typeof body.operationId !== 'string' || !body.operationId.trim())
      throw new ServiceError('invalid', { drafts: 'A confirmation ID is required.' })
    if (!AUTO_QUEUE_MODES.includes(mode))
      throw new ServiceError('invalid', { drafts: 'Review a non-empty selection of drafts.' })
    return { operationId: body.operationId, mode, lineup: lineupOf(body.lineup) }
  })
  if (new Set(out.map((d) => d.operationId)).size !== out.length)
    throw new ServiceError('invalid', {
      drafts: 'Review a non-empty selection of different drafts.',
    })
  return out
}

/**
 * Q-QUEUE · Auto queue › Add to Main Queue: appends the club's reviewed draft lineups, in the
 * order given, as unprotected `auto` matches (like a generated batch). The draft working set stays
 * on the client; this is its only write. Each draft is keyed on its own operation ID, so a retried
 * transfer returns the stored matches. Both revisions the drafts were checked against are
 * required, and every draft is checked again against the locked inputs, so a changed queue or
 * roster is a conflict.
 */
export async function addAutoQueueDrafts(
  context: ClubContext,
  sessionId: string,
  input: { drafts: AutoQueueDraftInput[]; expectedQueueRevision: string; expectedRevision: string },
  options: AutoFillOptions = {},
) {
  let autoPlaced: AutoPlaced = []
  const reply = await matchCommand(context, sessionId, {}, async (tx, session) => {
    const keys = await Promise.all(
      input.drafts.map((d) => derivedId(d.operationId, 'auto-queue-draft')),
    )
    const done = await tx.match.findMany({
      where: { sourceOperationId: { in: keys } },
      select: { id: true, sessionId: true, sourceOperationId: true },
    })
    if (done.length) {
      if (done.length !== keys.length || done.some((m) => m.sessionId !== session.id))
        throw new ServiceError('conflict')
      const byKey = new Map(done.map((m) => [m.sourceOperationId, m.id]))
      const rows = []
      for (const key of keys)
        rows.push(matchDto((await loadMatch(tx, session.id, byKey.get(key) as string)) as MatchRow))
      return rows
    }
    requireRevision(session.queueRevision, input.expectedQueueRevision)
    requireRevision(session.revision, input.expectedRevision)
    const { ctx, roster } = await matchContext(tx, session)
    const view = sessionView(session)
    for (const draft of input.drafts) {
      const reason = autoQueueDraftConflict(
        { ...draft.lineup, id: draft.operationId, mode: draft.mode, reason: '', fingerprint: '' },
        view,
        ctx,
      )
      if (reason) throw new ServiceError('conflict', { drafts: reason })
    }
    const ids = new Set(roster.map((r) => r.id))
    const out = []
    for (const [i, draft] of input.drafts.entries())
      out.push(
        matchDto(
          await appendMatch(tx, session, ids, draft.lineup, {
            operationId: keys[i] as string,
            origin: 'auto',
            manualProtected: false,
          }),
        ),
      )
    autoPlaced = await fillAfterAdd(tx, session, keys[0] as string, options)
    return out
  })
  return withAutoPlaced(reply, autoPlaced)
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
  options: AutoFillOptions = {},
) {
  let autoPlaced: AutoPlaced = []
  const reply = await matchCommand(context, sessionId, {}, async (tx, session) => {
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
    autoPlaced = await fillAfterAdd(tx, session, input.operationId, options)
    return out
  })
  return withAutoPlaced(reply, autoPlaced)
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
