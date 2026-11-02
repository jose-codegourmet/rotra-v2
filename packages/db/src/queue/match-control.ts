import 'server-only'
import { canStart, substitutionCandidates, validateResult } from '@rotra/data/match/match.rules'
import type { ClubContext } from '../auth/account-context'
import type { MatchDecision, QueueSession } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { loadMatch, type MatchRow, matchCommand, matchContext, matchDto } from './match-store'
import { derivedId, type Tx } from './session-store'

/**
 * Match control (Q-MATCH). Each command is keyed on its operation ID. Holds are one row per court
 * and per roster player (and per known global player), so a race to start two matches with the
 * same player or court loses on the primary key inside the transaction and nothing is half-held.
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

/** Q-MATCH · Start. Revalidates presence, lineup, session and courts, then takes every hold at once. */
export async function startMatch(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; matchId: string; courtIds: string[] },
) {
  return matchCommand(context, sessionId, {}, async (tx, session) => {
    const match = await activeMatch(tx, session.id, input.matchId)
    const repeated = match.courtUsage.find((u) => u.acquireOperationId === input.operationId)
    if (repeated) return matchDto(match)
    const { ctx, roster } = await matchContext(tx, session)
    const view = ctx.matches.find((m) => m.id === match.id)
    if (!view || !canStart(view, input.courtIds, ctx))
      throw new ServiceError('conflict', { match: 'Something changed. Review the match again.' })
    const now = new Date()
    await tx.match.update({
      where: { id: match.id },
      data: { state: 'active', startedAt: now, queuePosition: null, revision: { increment: 1 } },
    })
    await tx.matchParticipation.updateMany({
      where: { matchId: match.id, leftAt: null },
      data: { startedWithMatch: true },
    })
    for (const courtId of input.courtIds) {
      await tx.activeCourtHold.create({
        data: {
          courtId,
          clubId: session.clubId,
          sessionId: session.id,
          matchId: match.id,
          heldAt: now,
        },
      })
      await tx.matchCourtUsage.create({
        data: {
          id: await derivedId(input.operationId, `court:${courtId}`),
          clubId: session.clubId,
          sessionId: session.id,
          matchId: match.id,
          courtId,
          acquiredAt: now,
          acquireOperationId: input.operationId,
        },
      })
    }
    const byId = new Map(roster.map((r) => [r.id, r]))
    for (const p of match.participations.filter((p) => !p.leftAt))
      await tx.activePlayerHold.create({
        data: {
          sessionPlayerId: p.sessionPlayerId,
          clubId: session.clubId,
          sessionId: session.id,
          matchId: match.id,
          playerId: byId.get(p.sessionPlayerId)?.playerIdAtEntry ?? null,
          heldAt: now,
        },
      })
    return matchDto((await loadMatch(tx, session.id, match.id)) as MatchRow)
  })
}

/**
 * Q-MATCH · Substitute. Closes the outgoing segment and opens the incoming one with the same
 * operation, and moves the player hold, in one transaction. Both players keep their segments; the
 * shared rule gives neither of them game credit for this match.
 */
export async function substitutePlayer(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; matchId: string; outId: string; inId: string },
) {
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
      },
    })
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
 * match). If any step fails nothing commits, so no court is freed by a failed write.
 */
async function decide(
  context: ClubContext,
  sessionId: string,
  matchId: string,
  operationId: string,
  outcome: Outcome,
) {
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
    return {
      match: matchDto((await loadMatch(tx, session.id, match.id)) as MatchRow),
      decision: decisionDto(decision),
    }
  })
  if (done && 'quarantined' in done.result)
    throw new ServiceError('conflict', { match: 'This match already has a confirmed outcome.' })
  return done
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
  },
) {
  const result = validateResult({
    winner: input.winningTeam,
    scoreA: input.teamAScore,
    scoreB: input.teamBScore,
  })
  if (result.winner === null) throw new ServiceError('invalid', { result: result.error })
  return decide(context, sessionId, input.matchId, input.operationId, {
    kind: 'completed',
    winningTeam: result.winner,
    teamAScore: input.teamAScore ?? null,
    teamBScore: input.teamBScore ?? null,
  })
}

/** An invalid decision contributes no game credit to anyone (facts are written only from completed). */
export async function invalidateMatch(
  context: ClubContext,
  sessionId: string,
  input: { operationId: string; matchId: string },
) {
  return decide(context, sessionId, input.matchId, input.operationId, { kind: 'invalid' })
}
