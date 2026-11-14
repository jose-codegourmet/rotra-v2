import 'server-only'
import {
  autoFillPlacements,
  canMoveCourt,
  canPlace,
  canReplacePlayer,
  canSendBack,
  canStart,
  SUBSTITUTION_CREDITS,
  substitutionCandidates,
  swapTarget,
  validateResult,
} from '@rotra/data/match/match.rules'
import type { SubstitutionCredit } from '@rotra/data/match/types'
import type { ClubContext } from '../auth/account-context'
import type { MatchDecision, QueueSession } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { loadMatch, type MatchRow, matchCommand, matchContext, matchDto } from './match-store'
import { derivedId, type Tx } from './session-store'

/**
 * Match control (Q-MATCH). Each command is keyed on its operation ID. Holds are one row per court
 * and per roster player (and per known global player), taken when the match is put on court, so a
 * race to place two matches with the same player or court loses on the primary key inside the
 * transaction and nothing is half-held.
 */

function decisionDto(decision: MatchDecision) {
  return {
    kind: decision.kind,
    winningTeam: decision.winningTeam,
    teamAScore: decision.teamAScore,
    teamBScore: decision.teamBScore,
    confirmedAt: decision.confirmedAt.toISOString(),
  }
}

async function activeMatch(tx: Tx, sessionId: string, matchId: string) {
  const match = await loadMatch(tx, sessionId, matchId)
  if (!match || match.removedAt) throw new ServiceError('not_found')
  return match
}

type Roster = Awaited<ReturnType<typeof matchContext>>['roster']

/**
 * Takes the court holds (with their court usage rows, keyed on the operation) and one hold per
 * current lineup player. The match must already be on_court or active (the hold trigger checks).
 * A court or player already held elsewhere loses on the primary key and nothing commits.
 */
async function takeHolds(
  tx: Tx,
  session: QueueSession,
  match: MatchRow,
  roster: Roster,
  courtIds: string[],
  operationId: string,
  now: Date,
) {
  await acquireCourts(tx, session, match, courtIds, operationId, now)
  await holdPlayers(tx, session, match, roster, now)
}

/**
 * Takes one court hold per court and records the court usage, keyed on the operation. Usage is
 * unique per match and court and never deleted, so a match coming back to a court it used before
 * (sent back or moved, then placed there again) takes its released row up again.
 */
async function acquireCourts(
  tx: Tx,
  session: QueueSession,
  match: MatchRow,
  courtIds: string[],
  operationId: string,
  now: Date,
) {
  for (const courtId of courtIds) {
    await tx.activeCourtHold.create({
      data: {
        courtId,
        clubId: session.clubId,
        sessionId: session.id,
        matchId: match.id,
        heldAt: now,
      },
    })
    const used = match.courtUsage.find((u) => u.courtId === courtId)
    if (used)
      await tx.matchCourtUsage.update({
        where: { id: used.id },
        data: {
          acquiredAt: now,
          acquireOperationId: operationId,
          releasedAt: null,
          releaseOperationId: null,
        },
      })
    else
      await tx.matchCourtUsage.create({
        data: {
          id: await derivedId(operationId, `court:${courtId}`),
          clubId: session.clubId,
          sessionId: session.id,
          matchId: match.id,
          courtId,
          acquiredAt: now,
          acquireOperationId: operationId,
        },
      })
  }
}

/** Gives up court holds (all, or only `courtIds`) and closes their usage with this operation. */
async function releaseCourts(
  tx: Tx,
  match: MatchRow,
  operationId: string,
  now: Date,
  courtIds?: string[],
) {
  const courts = courtIds ? { courtId: { in: courtIds } } : {}
  await tx.matchCourtUsage.updateMany({
    where: { matchId: match.id, releasedAt: null, ...courts },
    data: { releasedAt: now, releaseOperationId: operationId },
  })
  await tx.activeCourtHold.deleteMany({ where: { matchId: match.id, ...courts } })
}

/**
 * Makes the player holds match the current lineup: a hold for every open segment, none for anyone
 * who left the lineup. At placement this takes them all; at Start match it reuses them.
 */
async function holdPlayers(
  tx: Tx,
  session: QueueSession,
  match: MatchRow,
  roster: Roster,
  now: Date,
) {
  const lineup = new Set(
    match.participations.filter((p) => !p.leftAt).map((p) => p.sessionPlayerId),
  )
  const held = await tx.activePlayerHold.findMany({
    where: { matchId: match.id },
    select: { sessionPlayerId: true },
  })
  const stale = held.map((h) => h.sessionPlayerId).filter((id) => !lineup.has(id))
  if (stale.length)
    await tx.activePlayerHold.deleteMany({
      where: { matchId: match.id, sessionPlayerId: { in: stale } },
    })
  const have = new Set(held.map((h) => h.sessionPlayerId))
  const byId = new Map(roster.map((r) => [r.id, r]))
  for (const sessionPlayerId of lineup)
    if (!have.has(sessionPlayerId))
      await tx.activePlayerHold.create({
        data: {
          sessionPlayerId,
          clubId: session.clubId,
          sessionId: session.id,
          matchId: match.id,
          playerId: byId.get(sessionPlayerId)?.playerIdAtEntry ?? null,
          heldAt: now,
        },
      })
}

const conflict = () =>
  new ServiceError('conflict', { match: 'Something changed. Review the match again.' })

/**
 * Puts a waiting match on court(s): on_court with `placed_at`, out of the queue, then every court
 * and player hold (the hold trigger needs the state first). Shared by Put on court, Swap with the
 * queue and Auto Queue, so there is one way to place a match.
 */
async function putOnCourt(
  tx: Tx,
  session: QueueSession,
  match: MatchRow,
  roster: Roster,
  courtIds: string[],
  operationId: string,
  now: Date,
) {
  await tx.match.update({
    where: { id: match.id },
    data: { state: 'on_court', placedAt: now, queuePosition: null, revision: { increment: 1 } },
  })
  await takeHolds(tx, session, match, roster, courtIds, operationId, now)
}

/** Options every command that can trigger Auto Queue takes. */
export type AutoFillOptions = {
  /**
   * Offline sync replay (`sync.ts`): never auto-place. While a device is offline auto filling
   * pauses (owner decision, November 6, 2026), so an uploaded change never carries a placement.
   */
  replay?: boolean
}

/**
 * Auto Queue (Queueing › Auto Queue and Manual Queue), inside the triggering command's
 * transaction: when the locked session runs in Auto, each free open court (or only
 * `onlyCourtIds`), in court order, gets the next eligible waiting match On court. Never starts a
 * match; skips 5v5, courts not open yet and `exceptMatchId` (Send back); a court whose booking
 * ended still fills. Each placement is keyed on an operation derived from the trigger's, so it is
 * as repeat-safe as the trigger, and bumps the queue revision. Returns the placed matches.
 */
export async function autoFillCourts(
  tx: Tx,
  session: QueueSession,
  input: {
    operationId: string
    exceptMatchId?: string
    onlyCourtIds?: string[]
    /** Courts left free: the court the next-match picker opens for after a result (Q-NEXT-MATCH) */
    exceptCourtIds?: string[]
  } & AutoFillOptions,
) {
  if (input.replay || session.state !== 'active' || session.courtFillMode !== 'auto') return []
  const { ctx, rows, roster } = await matchContext(tx, session)
  const placements = autoFillPlacements(ctx, {
    exceptMatchId: input.exceptMatchId,
    onlyCourtIds: input.onlyCourtIds,
    exceptCourtIds: input.exceptCourtIds,
  })
  if (!placements.length) return []
  const now = new Date()
  const placed = []
  for (const { matchId, courtId } of placements) {
    const row = rows.find((r) => r.id === matchId)
    if (!row) continue
    const operationId = await derivedId(input.operationId, `auto-fill:${matchId}`)
    await putOnCourt(tx, session, row, roster, [courtId], operationId, now)
    placed.push(matchDto((await loadMatch(tx, session.id, matchId)) as MatchRow))
  }
  await tx.queueSession.update({
    where: { id: session.id },
    data: { queueRevision: { increment: 1 } },
  })
  return placed
}

/** A command reply with the Auto Queue placements it made (empty in Manual Queue or on replay). */
export type AutoPlaced = ReturnType<typeof matchDto>[]
export const withAutoPlaced = <T extends object>(done: T | undefined, autoPlaced: AutoPlaced) =>
  done ? { ...done, autoPlaced } : done

/**
 * Q-DISPATCH · Put on court. Revalidates presence, lineup, session and courts, then takes every
 * court and player hold at once: the match is on_court with `placed_at`, and `started_at` stays
 * null until Start match. Keyed on the operation ID through its court usage rows, so a retry (or a
 * replayed offline upload) returns the placed match.
 */
export async function placeOnCourt(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; matchId: string; courtIds: string[] },
) {
  return matchCommand(context, sessionId, {}, async (tx, session) => {
    const match = await activeMatch(tx, session.id, input.matchId)
    if (match.courtUsage.some((u) => u.acquireOperationId === input.operationId))
      return matchDto(match)
    const { ctx, roster } = await matchContext(tx, session)
    const view = ctx.matches.find((m) => m.id === match.id)
    if (!view || !canPlace(view, input.courtIds, ctx)) throw conflict()
    await putOnCourt(tx, session, match, roster, input.courtIds, input.operationId, new Date())
    return matchDto((await loadMatch(tx, session.id, match.id)) as MatchRow)
  })
}

/**
 * Q-ON-COURT · Start match. From on_court: no court choice; rechecks presence, busy players and
 * the held courts, reuses the holds taken at placement (bringing player holds in line with the
 * lineup), and starts the timer. From waiting: the older one-step start, which places and starts
 * at once on the chosen courts, kept for callers not yet moved to Put on court.
 *
 * Repeats: the one-step start is keyed on its court usage rows. A start from on_court has no row of
 * its own, so an already started match with the same (or no) courts returns as it is; a start
 * naming other courts is a conflict.
 */
export async function startMatch(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; matchId: string; courtIds: string[] },
) {
  return matchCommand(context, sessionId, {}, async (tx, session) => {
    const match = await activeMatch(tx, session.id, input.matchId)
    if (match.courtUsage.some((u) => u.acquireOperationId === input.operationId))
      return matchDto(match)
    if (match.state === 'active' && match.placedAt && !match.decision) {
      const held = new Set(match.courtHolds.map((h) => h.courtId))
      if (
        !input.courtIds.length ||
        (input.courtIds.length === held.size && input.courtIds.every((id) => held.has(id)))
      )
        return matchDto(match)
    }
    const { ctx, roster } = await matchContext(tx, session)
    const view = ctx.matches.find((m) => m.id === match.id)
    if (!view || !canStart(view, input.courtIds, ctx)) throw conflict()
    const now = new Date()
    const placed = match.state === 'on_court'
    await tx.match.update({
      where: { id: match.id },
      data: placed
        ? { state: 'active', startedAt: now, revision: { increment: 1 } }
        : {
            state: 'active',
            placedAt: now,
            startedAt: now,
            queuePosition: null,
            revision: { increment: 1 },
          },
    })
    await tx.matchParticipation.updateMany({
      where: { matchId: match.id, leftAt: null },
      data: { startedWithMatch: true },
    })
    if (placed) await holdPlayers(tx, session, match, roster, now)
    else await takeHolds(tx, session, match, roster, input.courtIds, input.operationId, now)
    return matchDto((await loadMatch(tx, session.id, match.id)) as MatchRow)
  })
}

/** An on_court match, or a conflict ("Something changed") for anything else. */
function requireOnCourt(match: MatchRow) {
  if (!canSendBack(match) || match.decision) throw conflict()
}

/**
 * An on_court or active match without a decision (Replace player), or a conflict ("Something
 * changed") for anything else: waiting, completed, invalid, or any decided match.
 */
function requireLineupEditable(match: MatchRow) {
  if ((match.state !== 'on_court' && match.state !== 'active') || match.decision) throw conflict()
}

/**
 * Waiting matches in queue order with `match` placed at `index` (0-based); renumbers positions 1..n
 * so the order is exact. Returns the match's 1-based queue position.
 */
async function queueAt(tx: Tx, sessionId: string, matchId: string, index: number) {
  const list = (
    await tx.match.findMany({
      where: { sessionId, state: 'waiting', removedAt: null, id: { not: matchId } },
      orderBy: [{ queuePosition: 'asc' }, { matchNo: 'asc' }],
      select: { id: true },
    })
  ).map((m) => m.id)
  list.splice(Math.max(0, Math.min(list.length, index)), 0, matchId)
  for (const [i, id] of list.entries())
    await tx.match.update({ where: { id }, data: { queuePosition: BigInt(i + 1) } })
  return list.indexOf(matchId) + 1
}

/** The 1-based place of a waiting match in the queue (for the swap reply). */
async function queuePlace(tx: Tx, sessionId: string, matchId: string) {
  const list = await tx.match.findMany({
    where: { sessionId, state: 'waiting', removedAt: null },
    orderBy: [{ queuePosition: 'asc' }, { matchNo: 'asc' }],
    select: { id: true },
  })
  return list.findIndex((m) => m.id === matchId) + 1
}

/**
 * Takes an on_court match off its court(s): releases court and player holds, closes court usage
 * with this operation, clears `placed_at`. `manual_protected` is kept, so a match edited while On
 * court (Replace player) goes back protected. The caller sets the queue position.
 */
async function unplace(tx: Tx, match: MatchRow, operationId: string, now: Date) {
  await releaseCourts(tx, match, operationId, now)
  await tx.activePlayerHold.deleteMany({ where: { matchId: match.id } })
  await tx.match.update({
    where: { id: match.id },
    data: { state: 'waiting', placedAt: null, revision: { increment: 1 } },
  })
}

/**
 * Q-ON-COURT · Send back to queue. The on_court match goes to the **top** of the queue (positions
 * renumbered) and its court(s) and players free up, in one transaction. Keyed on the operation ID
 * through its court usage release, so a retry (or a replayed offline upload) returns the match.
 * In Auto Queue the freed court is refilled in the same transaction with the next eligible match
 * other than this one (never on replay).
 */
export async function sendBackToQueue(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; matchId: string },
  options: AutoFillOptions = {},
) {
  let autoPlaced: AutoPlaced = []
  const done = await matchCommand(context, sessionId, {}, async (tx, session) => {
    const match = await activeMatch(tx, session.id, input.matchId)
    if (match.courtUsage.some((u) => u.releaseOperationId === input.operationId))
      return matchDto(match)
    requireOnCourt(match)
    await unplace(tx, match, input.operationId, new Date())
    await queueAt(tx, session.id, match.id, 0)
    const result = matchDto((await loadMatch(tx, session.id, match.id)) as MatchRow)
    autoPlaced = await autoFillCourts(tx, session, {
      ...options,
      operationId: input.operationId,
      exceptMatchId: match.id,
    })
    return result
  })
  return withAutoPlaced(done, autoPlaced)
}

/**
 * Q-ON-COURT · Move to another court. The on_court match releases the court(s) it holds and takes
 * the chosen free open court(s) (two for 5v5) in one transaction; player holds stay. A court
 * another match took first loses on the hold's primary key. Keyed on the new court usage rows.
 * In Auto Queue the court(s) it left are refilled in the same transaction (never on replay).
 */
export async function moveCourt(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; matchId: string; courtIds: string[] },
  options: AutoFillOptions = {},
) {
  let autoPlaced: AutoPlaced = []
  const done = await matchCommand(context, sessionId, {}, async (tx, session) => {
    const match = await activeMatch(tx, session.id, input.matchId)
    if (match.courtUsage.some((u) => u.acquireOperationId === input.operationId))
      return matchDto(match)
    requireOnCourt(match)
    const { ctx } = await matchContext(tx, session)
    const view = ctx.matches.find((m) => m.id === match.id)
    if (!view || !canMoveCourt(view, input.courtIds, ctx)) throw conflict()
    const now = new Date()
    await releaseCourts(tx, match, input.operationId, now)
    await acquireCourts(tx, session, match, input.courtIds, input.operationId, now)
    await tx.match.update({ where: { id: match.id }, data: { revision: { increment: 1 } } })
    const result = matchDto((await loadMatch(tx, session.id, match.id)) as MatchRow)
    autoPlaced = await autoFillCourts(tx, session, { ...options, operationId: input.operationId })
    return result
  })
  return withAutoPlaced(done, autoPlaced)
}

/**
 * Q-ON-COURT / Q-MATCH · Replace player. A lineup change on an On court match, or the fix for a
 * mistake on a Playing (active) match (owner, November 13, 2026; real mode November 14, 2026,
 * #840). Never a substitution: no segment is closed, so none is derived and no credit is asked.
 * Rechecks that the incoming player is present and not busy; the player holds follow the lineup;
 * the match becomes manual and protected.
 *
 * - **On court:** the outgoing player's segment is removed and the incoming player gets a fresh
 *   segment on the same team, keyed on this operation (`joined_operation_id`).
 * - **Playing:** segments of a started match are never deleted (the `match_evidence_frozen`
 *   trigger), so the outgoing player's open segment is handed to the incoming player in place: the
 *   same row gets the incoming `session_player_id` and their next `segment_no`, and keeps its
 *   `joined_at`, `started_with_match`, `team`, `credit_to` and `joined_operation_id`. The outgoing
 *   player is left with nothing from this stretch, and the replacement is recorded as having
 *   played it: from the start (a full game at Match done: one segment, started and finished) or,
 *   if the segment came from an earlier substitution, as that substitution's incoming player. The
 *   kept `joined_operation_id` still matches the earlier segment's `left_operation_id`, so
 *   `slotSegments` and the substitution credit stay intact.
 *
 * Idempotent: a retry (or replayed offline upload) returns the match when this operation's segment
 * exists (On court), or when the incoming player is in the lineup and the outgoing one is not
 * (Playing: the row keeps the earlier operation, and before the replace that state cannot occur,
 * since the outgoing player must be in the lineup and the incoming one must not).
 */
export async function replacePlayer(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; matchId: string; outId: string; inId: string },
) {
  return matchCommand(context, sessionId, {}, async (tx, session) => {
    const match = await activeMatch(tx, session.id, input.matchId)
    const open = (id: string) =>
      match.participations.some((p) => p.sessionPlayerId === id && !p.leftAt)
    if (
      match.participations.some(
        (p) => p.joinedOperationId === input.operationId && p.sessionPlayerId === input.inId,
      ) ||
      (match.state === 'active' && !match.decision && open(input.inId) && !open(input.outId))
    )
      return matchDto(match)
    requireLineupEditable(match)
    const { ctx, roster } = await matchContext(tx, session)
    const view = ctx.matches.find((m) => m.id === match.id)
    const outgoing = match.participations.find(
      (p) => p.sessionPlayerId === input.outId && !p.leftAt,
    )
    if (!view || !outgoing || !canReplacePlayer(view, input.outId, input.inId, ctx))
      throw conflict()
    const now = new Date()
    if (match.state === 'active') {
      const segments = match.participations.filter((p) => p.sessionPlayerId === input.inId).length
      await tx.matchParticipation.update({
        where: { id: outgoing.id },
        data: { sessionPlayerId: input.inId, segmentNo: segments + 1 },
      })
    } else {
      await tx.matchParticipation.delete({ where: { id: outgoing.id } })
      await tx.matchParticipation.create({
        data: {
          id: await derivedId(input.operationId, `${match.id}:${input.inId}`),
          clubId: session.clubId,
          sessionId: session.id,
          matchId: match.id,
          sessionPlayerId: input.inId,
          team: outgoing.team,
          segmentNo: 1,
          joinedOperationId: input.operationId,
          joinedAt: now,
        },
      })
    }
    await tx.match.update({
      where: { id: match.id },
      data: { origin: 'manual', manualProtected: true, revision: { increment: 1 } },
    })
    const changed = (await loadMatch(tx, session.id, match.id)) as MatchRow
    await holdPlayers(tx, session, changed, roster, now)
    return matchDto(changed)
  })
}

/**
 * Q-ON-COURT · Swap with the queue. Rechecks that `withMatchId` is still the swap target (the next
 * ready waiting match needing the same courts, this match's players counted free); otherwise a
 * conflict. In one transaction: this match releases its holds and takes the target's queue
 * position; the target goes on_court on the same court(s) and takes the holds. Keyed on this
 * match's court usage release.
 */
export async function swapWithQueue(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; matchId: string; withMatchId: string },
) {
  return matchCommand(context, sessionId, {}, async (tx, session) => {
    const match = await activeMatch(tx, session.id, input.matchId)
    const reply = async () => ({
      match: matchDto((await loadMatch(tx, session.id, match.id)) as MatchRow),
      placed: matchDto((await loadMatch(tx, session.id, input.withMatchId)) as MatchRow),
      position: await queuePlace(tx, session.id, match.id),
    })
    if (match.courtUsage.some((u) => u.releaseOperationId === input.operationId)) return reply()
    requireOnCourt(match)
    const { ctx, roster } = await matchContext(tx, session)
    const view = ctx.matches.find((m) => m.id === match.id)
    const target = view && swapTarget(view, ctx)
    if (!target || target.match.id !== input.withMatchId) throw conflict()
    const incoming = await activeMatch(tx, session.id, input.withMatchId)
    const courtIds = match.courtHolds.map((h) => h.courtId)
    const now = new Date()
    await unplace(tx, match, input.operationId, now)
    await tx.match.update({
      where: { id: match.id },
      data: { queuePosition: incoming.queuePosition },
    })
    await putOnCourt(tx, session, incoming, roster, courtIds, input.operationId, now)
    return reply()
  })
}

/**
 * The earlier substitution segments of a team slot: walking back from `segment`, each segment a
 * substitution opened (its operation closed another segment), until one that started the match.
 */
function slotSegments(
  participations: MatchRow['participations'],
  segment: MatchRow['participations'][number],
) {
  const found: MatchRow['participations'] = []
  let current = segment
  for (;;) {
    const opened = current,
      replaced = participations.find(
        (p) => p.id !== opened.id && p.leftOperationId === opened.joinedOperationId,
      )
    if (!replaced || found.includes(opened)) return found
    found.push(opened)
    current = replaced
  }
}

/**
 * Q-MATCH · Substitute. Closes the outgoing segment and opens the incoming one with the same
 * operation, and moves the player hold, in one transaction. Both players keep their segments.
 * `creditTo` (who gets this game, QM choice: none by default, incoming or outgoing) is written on
 * the incoming segment; naming a person clears an earlier choice in the same team slot, so at most
 * one person per slot gets the game. Only while active, so the choice is frozen at the decision.
 * Session counting reads it; long-term performance never does.
 */
export async function substitutePlayer(
  context: ClubContext,
  sessionId: string,
  input: {
    operationId: string
    matchId: string
    outId: string
    inId: string
    creditTo?: string
  },
) {
  const creditTo = (input.creditTo ?? 'none') as SubstitutionCredit
  if (!SUBSTITUTION_CREDITS.includes(creditTo))
    throw new ServiceError('invalid', { creditTo: 'Choose who gets this game.' })
  return matchCommand(context, sessionId, {}, async (tx, session) => {
    const match = await activeMatch(tx, session.id, input.matchId)
    if (
      match.participations.some(
        (p) => p.joinedOperationId === input.operationId && p.sessionPlayerId === input.inId,
      )
    )
      return matchDto(match)
    if (match.state !== 'active' || match.decision)
      throw new ServiceError('conflict', {
        match: 'This match already has a confirmed outcome or is not active.',
      })
    const { ctx, roster } = await matchContext(tx, session)
    const view = ctx.matches.find((m) => m.id === match.id)
    const outgoing = match.participations.find(
      (p) => p.sessionPlayerId === input.outId && !p.leftAt,
    )
    const incoming =
      view && substitutionCandidates(view, ctx.roster, ctx.matches).find((p) => p.id === input.inId)
    if (!outgoing || !incoming)
      throw new ServiceError('conflict', { match: 'Something changed. Review the match again.' })
    const now = new Date()
    await tx.matchParticipation.update({
      where: { id: outgoing.id },
      data: { leftAt: now, leftOperationId: input.operationId },
    })
    const segments = match.participations.filter((p) => p.sessionPlayerId === input.inId).length
    await tx.matchParticipation.create({
      data: {
        id: await derivedId(input.operationId, 'in'),
        clubId: session.clubId,
        sessionId: session.id,
        matchId: match.id,
        sessionPlayerId: input.inId,
        team: outgoing.team,
        segmentNo: segments + 1,
        joinedOperationId: input.operationId,
        joinedAt: now,
        creditTo,
      },
    })
    if (creditTo !== 'none') {
      const earlier = slotSegments(match.participations, outgoing).filter(
        (p) => p.creditTo !== 'none',
      )
      if (earlier.length)
        await tx.matchParticipation.updateMany({
          where: { id: { in: earlier.map((p) => p.id) } },
          data: { creditTo: 'none' },
        })
    }
    await tx.activePlayerHold.delete({ where: { sessionPlayerId: input.outId } })
    await tx.activePlayerHold.create({
      data: {
        sessionPlayerId: input.inId,
        clubId: session.clubId,
        sessionId: session.id,
        matchId: match.id,
        playerId: roster.find((r) => r.id === input.inId)?.playerIdAtEntry ?? null,
        heldAt: now,
      },
    })
    await tx.match.update({ where: { id: match.id }, data: { revision: { increment: 1 } } })
    return matchDto((await loadMatch(tx, session.id, match.id)) as MatchRow)
  })
}

type Outcome =
  | {
      kind: 'completed'
      winningTeam: 'A' | 'B'
      teamAScore: number | null
      teamBScore: number | null
    }
  | { kind: 'invalid' }

/**
 * A second terminal command for a decided match. The same operation returns the original outcome;
 * a different, contradicting one is quarantined as conflict evidence and never overwrites it.
 */
async function decidedAlready(
  tx: Tx,
  session: QueueSession,
  match: MatchRow,
  operationId: string,
  outcome: Outcome,
) {
  const decision = match.decision as MatchDecision
  if (decision.sourceOperationId === operationId)
    return { match: matchDto(match), decision: decisionDto(decision) }
  const same =
    decision.kind === outcome.kind &&
    (outcome.kind === 'invalid' ||
      (decision.winningTeam === outcome.winningTeam &&
        decision.teamAScore === outcome.teamAScore &&
        decision.teamBScore === outcome.teamBScore))
  // An agreeing confirmation from another device changes nothing and returns the original.
  if (same) return { match: matchDto(match), decision: decisionDto(decision) }
  await tx.syncConflict.create({
    data: {
      id: await derivedId(operationId, 'conflict'),
      clubId: session.clubId,
      sessionId: session.id,
      category: 'contradictory_decision',
      evidence: { version: 1, matchId: match.id, operationId, attempted: outcome },
    },
  })
  // Returned, not thrown, so the quarantine row commits; the caller then reports the conflict.
  return { quarantined: true as const }
}

/**
 * Q-MATCH · Team A/B wins or Invalid. One transaction closes every open segment, releases court
 * usage, frees all holds and appends the one permanent decision (after which triggers freeze the
 * match). If any step fails nothing commits, so no court is freed by a failed write. In Auto Queue
 * the freed court(s) get the next eligible match in the same transaction (never on replay).
 */
async function decide(
  context: ClubContext,
  sessionId: string,
  matchId: string,
  operationId: string,
  outcome: Outcome,
  options: AutoFillOptions & { exceptCourtIds?: string[] },
) {
  let autoPlaced: AutoPlaced = []
  const done = await matchCommand(context, sessionId, {}, async (tx, session) => {
    const match = await activeMatch(tx, session.id, matchId)
    if (match.decision) return decidedAlready(tx, session, match, operationId, outcome)
    if (match.state !== 'active')
      throw new ServiceError('conflict', { match: 'This match is not active.' })
    const now = new Date()
    // Players still on court finish with the match. `left_at` stays empty: it marks leaving
    // mid-match (substitution), and a finisher's segment ends at the match's `ended_at`.
    await tx.matchParticipation.updateMany({
      where: { matchId: match.id, leftAt: null },
      data: { finishedWithMatch: true },
    })
    await tx.matchCourtUsage.updateMany({
      where: { matchId: match.id, releasedAt: null },
      data: { releasedAt: now, releaseOperationId: operationId },
    })
    await tx.activeCourtHold.deleteMany({ where: { matchId: match.id } })
    await tx.activePlayerHold.deleteMany({ where: { matchId: match.id } })
    // The decision goes in before the state change: the match trigger refuses an end without one.
    const decision = await tx.matchDecision.create({
      data: {
        matchId: match.id,
        clubId: session.clubId,
        sessionId: session.id,
        kind: outcome.kind,
        winningTeam: outcome.kind === 'completed' ? outcome.winningTeam : null,
        teamAScore: outcome.kind === 'completed' ? outcome.teamAScore : null,
        teamBScore: outcome.kind === 'completed' ? outcome.teamBScore : null,
        sourceOperationId: operationId,
        confirmedAt: now,
        actorClubId: context.clubId,
      },
    })
    await tx.match.update({
      where: { id: match.id },
      data: { state: outcome.kind, endedAt: now, revision: { increment: 1 } },
    })
    const result = {
      match: matchDto((await loadMatch(tx, session.id, match.id)) as MatchRow),
      decision: decisionDto(decision),
    }
    autoPlaced = await autoFillCourts(tx, session, { ...options, operationId })
    return result
  })
  if (done && 'quarantined' in done.result)
    throw new ServiceError('conflict', { match: 'This match already has a confirmed outcome.' })
  return withAutoPlaced(done, autoPlaced)
}

/** Winner-only results keep both scores null; scores must agree with the winner. */
export async function completeMatch(
  context: ClubContext,
  sessionId: string,
  input: {
    operationId: string
    matchId: string
    winningTeam?: 'A' | 'B' | null
    teamAScore?: number | null
    teamBScore?: number | null
    /** The court the next-match picker opens for: Auto Queue leaves it free (Q-NEXT-MATCH) */
    holdCourtId?: string | null
  },
  options: AutoFillOptions = {},
) {
  const result = validateResult({
    winner: input.winningTeam,
    scoreA: input.teamAScore,
    scoreB: input.teamBScore,
  })
  if (result.winner === null) throw new ServiceError('invalid', { result: result.error })
  return decide(
    context,
    sessionId,
    input.matchId,
    input.operationId,
    {
      kind: 'completed',
      winningTeam: result.winner,
      teamAScore: input.teamAScore ?? null,
      teamBScore: input.teamBScore ?? null,
    },
    { ...options, exceptCourtIds: input.holdCourtId ? [input.holdCourtId] : undefined },
  )
}

/** An invalid decision contributes no game credit to anyone (facts are written only from completed). */
export async function invalidateMatch(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; matchId: string },
  options: AutoFillOptions = {},
) {
  return decide(context, sessionId, input.matchId, input.operationId, { kind: 'invalid' }, options)
}

const COURT_FILL_MODES = ['manual', 'auto'] as const
type CourtFillMode = (typeof COURT_FILL_MODES)[number]

/**
 * Q-COURTS · Manual Queue | Auto Queue, any time while the session runs. Online only: there is no
 * sync replay for it (owner decision, November 6, 2026). Turning Auto on fills every free open
 * court now, in court order, in the same transaction; turning it off leaves On court matches where
 * they are. Setting the mode it already has changes nothing (and places nothing).
 */
export async function setCourtFillMode(
  context: ClubContext,
  sessionId: string,
  input: { mode: string },
) {
  const mode = input.mode as CourtFillMode
  if (!COURT_FILL_MODES.includes(mode))
    throw new ServiceError('invalid', { mode: 'Choose Manual Queue or Auto Queue.' })
  return matchCommand(context, sessionId, {}, async (tx, session) => {
    if (session.courtFillMode === mode) return { mode, placed: [] as AutoPlaced }
    const updated = await tx.queueSession.update({
      where: { id: session.id },
      data: { courtFillMode: mode, revision: { increment: 1 } },
    })
    const placed = await autoFillCourts(tx, updated, { operationId: crypto.randomUUID() })
    return { mode, placed }
  })
}

/**
 * Q-COURTS · Auto Queue when courts reach their planned opening time (the console notices on its
 * refresh). Fills only the named courts, only in Auto Queue; with nothing to place it changes no
 * match. Online only, like the switch.
 */
export async function fillOpenedCourts(
  context: ClubContext,
  sessionId: string,
  input: { courtIds: string[] },
) {
  return matchCommand(context, sessionId, {}, async (tx, session) => ({
    mode: session.courtFillMode,
    placed: await autoFillCourts(tx, session, {
      operationId: crypto.randomUUID(),
      onlyCourtIds: input.courtIds,
    }),
  }))
}
