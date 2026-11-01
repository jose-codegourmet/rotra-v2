import 'server-only'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { DeviceSessionStream, Prisma, SyncOperation } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { toDecimalString, toIso, toIsoOrNull } from '../service/serialize'
import { completeMatch, invalidateMatch, startMatch, substitutePlayer } from './match-control'
import {
  addManualMatch,
  addSuggestedMatch,
  autoQueue,
  makeMatch,
  moveMatch,
  regenerateQueue,
  removeWaitingMatch,
  updateWaitingLineup,
} from './match-queue'
import { setPaid } from './financials'
import {
  addNewPlayerToSession,
  addSavedPlayerToSession,
  confirmJoinRequest,
  declineJoinRequest,
  giveSlot,
  setPresence,
} from './session-roster'
import { lockSession, requireSessionAccess, type Tx } from './session-store'

/**
 * Server side of offline sync (Q-OFFLINE). Proposals pending #246 are marked. The browser outbox
 * and working copy are separate (Q11); this module alone does not enable offline use.
 *
 * Uploads are dispatched through the SAME domain services as online commands, with the operation
 * ID as the command's operation ID, so every effect is repeat-safe. Acceptance is recorded after
 * the domain transaction commits; if the server stops in between, the operation stays `received`
 * and reprocessing re-runs the idempotent command, which returns the stored effect.
 */

/** Uploadable command kinds → the online service they run. Anything else is rejected. */
const DISPATCH: Record<
  string,
  (context: ClubContext, sessionId: string, operationId: string, payload: Record<string, unknown>) => Promise<unknown>
> = {
  'roster.add_saved': (c, s, id, p) => addSavedPlayerToSession(c, s, { ...(p as never), operationId: id }),
  'roster.add_new': (c, s, id, p) => addNewPlayerToSession(c, s, { ...(p as never), operationId: id }),
  'roster.presence': (c, s, _id, p) => setPresence(c, s, p as never),
  'roster.give_slot': (c, s, id, p) => giveSlot(c, s, { ...(p as never), operationId: id }),
  'join_request.confirm': (c, _s, id, p) => confirmJoinRequest(c, { ...(p as never), operationId: id }),
  'join_request.decline': (c, _s, _id, p) => declineJoinRequest(c, p as never),
  'queue.add': (c, s, id, p) => addManualMatch(c, s, { ...(p as never), operationId: id }),
  'queue.make': (c, s, id, p) => makeMatch(c, s, { ...(p as never), operationId: id }),
  'queue.add_suggested': (c, s, id, p) => addSuggestedMatch(c, s, { ...(p as never), operationId: id }),
  'queue.auto': (c, s, id, p) => autoQueue(c, s, { ...(p as never), operationId: id }),
  'queue.regenerate': (c, s, id, p) => regenerateQueue(c, s, { ...(p as never), operationId: id }),
  'queue.move': (c, s, _id, p) => moveMatch(c, s, p as never),
  'queue.lineup': (c, s, id, p) => updateWaitingLineup(c, s, { ...(p as never), operationId: id }),
  'queue.remove': (c, s, _id, p) => removeWaitingMatch(c, s, p as never),
  'match.start': (c, s, id, p) => startMatch(c, s, { ...(p as never), operationId: id }),
  'match.substitute': (c, s, id, p) => substitutePlayer(c, s, { ...(p as never), operationId: id }),
  'match.complete': (c, s, id, p) => completeMatch(c, s, { ...(p as never), operationId: id }),
  'match.invalidate': (c, s, id, p) => invalidateMatch(c, s, { ...(p as never), operationId: id }),
  'payment.set': (c, s, id, p) => setPaid(c, s, { ...(p as never), operationId: id }),
}

/** Commands that may arrive after Session done: only payment marks (the finalized payment boundary). */
const AFTER_COMPLETION = new Set(['payment.set'])

/** Canonical JSON (sorted keys) so the same payload always has the same digest. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`
}

async function sha256(text: string | Uint8Array) {
  const bytes = typeof text === 'string' ? new TextEncoder().encode(text) : text
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
}

const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i])

function streamDto(stream: DeviceSessionStream) {
  return {
    id: stream.id,
    sessionId: stream.sessionId,
    deviceId: stream.deviceId,
    generationNo: stream.generationNo,
    downloadedRevision: toDecimalString(stream.downloadedRevision),
    contiguousSequence: toDecimalString(stream.contiguousSequence),
    highestReceivedSequence: toDecimalString(stream.highestReceivedSeq),
    sealedFinalSequence: stream.sealedFinalSequence == null ? null : toDecimalString(stream.sealedFinalSequence),
    sealedAt: toIsoOrNull(stream.sealedAt),
    state: stream.state,
  }
}

/** A receipt: what the server did with one operation. Never includes the payload. */
function receiptDto(op: SyncOperation) {
  return {
    operationId: op.id,
    sequence: toDecimalString(op.sequence),
    state: op.state,
    resultRevision: op.resultRevision == null ? null : toDecimalString(op.resultRevision),
    rejectionCode: op.rejectionCode,
    receivedAt: toIso(op.receivedAt),
    processedAt: toIsoOrNull(op.processedAt),
  }
}

/** Registers a browser on the club account. The client chooses a stable device ID. */
export async function registerDevice(context: ClubContext, input: { deviceId: string; label: string }) {
  const label = input.label.trim() || 'This device'
  const existing = await prisma.device.findUnique({ where: { id: input.deviceId } })
  if (existing) {
    if (existing.clubId !== context.clubId) throw new ServiceError('not_found')
    if (existing.revokedAt) throw new ServiceError('forbidden', { device: 'This device was removed.' })
    return { deviceId: existing.id, label: existing.label }
  }
  const device = await prisma.device.create({
    data: { id: input.deviceId, clubId: context.clubId, label, registeredAt: new Date() },
  })
  return { deviceId: device.id, label: device.label }
}

async function requireDevice(tx: Tx, context: ClubContext, deviceId: string) {
  const device = await tx.device.findUnique({ where: { clubId_id: { clubId: context.clubId, id: deviceId } } })
  if (!device || device.revokedAt) throw new ServiceError('forbidden', { device: 'Register this device first.' })
  return device
}

/**
 * Q-OFFLINE · Download for offline use: enrolls one writable stream for (session, device) and takes
 * the club's one-offline-session reservation, online. A download alone is not write authorization.
 *
 * A second device, or recovery on a new generation, may enroll only by revoking the previous open
 * stream (`recovery: true`). The revoked stream's unproven tail is recorded as an open
 * `missing_prerequisite` conflict, so completeness stays unproven until the Queue Master resolves
 * it (proposal pending #246). Repeat-safe on `streamId`.
 */
export async function enrollStream(
  context: ClubContext,
  input: { sessionId: string; deviceId: string; streamId: string; recovery?: boolean },
) {
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, input.sessionId)
    await requireSessionAccess(context, session)
    if (!['prepared', 'active'].includes(session.state))
      throw new ServiceError('invalid', { state: 'This session can no longer be downloaded.' })
    await requireDevice(tx, context, input.deviceId)
    const repeated = await tx.deviceSessionStream.findUnique({ where: { id: input.streamId } })
    if (repeated) {
      if (repeated.sessionId !== session.id || repeated.deviceId !== input.deviceId) throw new ServiceError('conflict')
      return streamDto(repeated)
    }
    const reservation = await tx.clubSessionReservation.findUnique({ where: { clubId: context.clubId } })
    if (reservation && reservation.sessionId !== session.id)
      throw new ServiceError('conflict', { session: 'Another session is downloaded for offline use.' })
    if (!reservation)
      await tx.clubSessionReservation.create({
        data: { clubId: context.clubId, sessionId: session.id, acquiredAt: new Date() },
      })
    const open = await tx.deviceSessionStream.findMany({ where: { sessionId: session.id, state: 'open' } })
    if (open.length && !input.recovery)
      throw new ServiceError('conflict', { stream: 'Another device holds this session. Use recovery to take over.' })
    for (const stream of open) {
      await tx.deviceSessionStream.update({
        where: { id: stream.id },
        data: { state: 'revoked', revision: { increment: 1 } },
      })
      await tx.syncConflict.create({
        data: {
          id: crypto.randomUUID(),
          clubId: context.clubId,
          sessionId: session.id,
          category: 'missing_prerequisite',
          evidence: {
            version: 1,
            reason: 'stream_revoked_unsealed',
            streamId: stream.id,
            deviceId: stream.deviceId,
            contiguousSequence: stream.contiguousSequence.toString(),
            highestReceivedSequence: stream.highestReceivedSeq.toString(),
            replacedByStreamId: input.streamId,
          },
        },
      })
    }
    const generations = await tx.deviceSessionStream.count({
      where: { sessionId: session.id, deviceId: input.deviceId },
    })
    const stream = await tx.deviceSessionStream.create({
      data: {
        id: input.streamId,
        clubId: context.clubId,
        sessionId: session.id,
        deviceId: input.deviceId,
        generationNo: generations + 1,
        downloadedRevision: session.revision,
        enrolledAt: new Date(),
      },
    })
    return streamDto(stream)
  })
}

export type UploadedOperation = {
  operationId: string
  /** Decimal string; positive and contiguous per stream. */
  sequence: string
  entityType: string
  entityId: string
  commandKind: string
  baseRevision: string | null
  payloadVersion: number
  payload: Record<string, unknown>
  occurredAt: string
}

async function lockStream(tx: Tx, context: ClubContext, streamId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "device_session_streams"
    WHERE "id" = ${streamId}::uuid AND "club_id" = ${context.clubId}::uuid FOR UPDATE`
  if (!rows.length) throw new ServiceError('not_found')
  return tx.deviceSessionStream.findUniqueOrThrow({ where: { id: streamId } })
}

/**
 * Stores uploaded envelopes. Same ID + same digest returns the stored receipt; same ID with a
 * changed payload, or another ID at a used sequence, is a `payload_mismatch` conflict (the new
 * envelope is not stored over the old one). Gaps are kept visible: `highest_received_sequence`
 * moves, `contiguous_sequence` does not.
 */
async function receive(context: ClubContext, streamId: string, operations: UploadedOperation[]) {
  return prisma.$transaction(async (tx) => {
    const stream = await lockStream(tx, context, streamId)
    if (stream.state !== 'open') throw new ServiceError('forbidden', { stream: 'This stream is closed.' })
    const receipts: ReturnType<typeof receiptDto>[] = []
    const rejected: { operationId: string; code: string }[] = []
    let highest = stream.highestReceivedSeq
    for (const op of operations) {
      let sequence: bigint
      try {
        sequence = BigInt(op.sequence)
      } catch {
        rejected.push({ operationId: op.operationId, code: 'bad_sequence' })
        continue
      }
      if (sequence <= 0n) {
        rejected.push({ operationId: op.operationId, code: 'bad_sequence' })
        continue
      }
      const digest = await sha256(canonical(op.payload))
      const existing = await tx.syncOperation.findUnique({ where: { id: op.operationId } })
      const atSequence = await tx.syncOperation.findUnique({
        where: { streamId_sequence: { streamId, sequence } },
      })
      if (existing || atSequence) {
        const original = existing ?? (atSequence as SyncOperation)
        if (existing && existing.streamId === streamId && existing.sequence === sequence && sameBytes(existing.payloadDigest, digest)) {
          receipts.push(receiptDto(existing))
          continue
        }
        await tx.syncConflict.create({
          data: {
            id: crypto.randomUUID(),
            clubId: context.clubId,
            sessionId: stream.sessionId,
            category: 'payload_mismatch',
            evidence: {
              version: 1,
              streamId,
              attemptedOperationId: op.operationId,
              attemptedSequence: sequence.toString(),
              storedOperationId: original.id,
            },
            operations: {
              create: [{ operationId: original.id, clubId: context.clubId, sessionId: stream.sessionId }],
            },
          },
        })
        rejected.push({ operationId: op.operationId, code: 'payload_mismatch' })
        continue
      }
      const stored = await tx.syncOperation.create({
        data: {
          id: op.operationId,
          clubId: context.clubId,
          sessionId: stream.sessionId,
          streamId,
          sequence,
          entityType: op.entityType,
          entityId: op.entityId,
          commandKind: op.commandKind,
          baseRevision: op.baseRevision == null ? null : BigInt(op.baseRevision),
          payloadVersion: op.payloadVersion,
          payload: op.payload as Prisma.InputJsonValue,
          payloadDigest: digest,
          occurredAt: new Date(op.occurredAt),
        },
      })
      receipts.push(receiptDto(stored))
      if (sequence > highest) highest = sequence
    }
    if (highest !== stream.highestReceivedSeq)
      await tx.deviceSessionStream.update({
        where: { id: streamId },
        data: { highestReceivedSeq: highest, revision: { increment: 1 } },
      })
    return { receipts, rejected }
  })
}

async function settle(
  op: SyncOperation,
  state: 'accepted' | 'rejected' | 'conflicted',
  extra: { rejectionCode?: string; conflictCategory?: 'revision_mismatch' | 'contradictory_decision' } = {},
) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.queueSession.findUniqueOrThrow({ where: { id: op.sessionId }, select: { revision: true, queueRevision: true } })
    const updated = await tx.syncOperation.update({
      where: { id: op.id },
      data: {
        state,
        processedAt: new Date(),
        resultRevision: state === 'accepted' ? session.revision : null,
        rejectionCode: extra.rejectionCode ?? null,
      },
    })
    if (state === 'conflicted')
      await tx.syncConflict.create({
        data: {
          id: crypto.randomUUID(),
          clubId: op.clubId,
          sessionId: op.sessionId,
          category: extra.conflictCategory ?? 'revision_mismatch',
          evidence: { version: 1, commandKind: op.commandKind, entityType: op.entityType, entityId: op.entityId },
          operations: { create: [{ operationId: op.id, clubId: op.clubId, sessionId: op.sessionId }] },
        },
      })
    return updated
  })
}

/**
 * Processes the stream in sequence order from its contiguous prefix: each `received` operation runs
 * through its domain service, then is marked accepted, rejected (invalid input, unknown kind, after
 * the finalized boundary) or conflicted (stale revision or contradicting outcome, quarantined with
 * evidence). Processing stops at the first gap, so nothing after a missing original is applied, and
 * a conflicted operation advances the prefix only after its conflicts are resolved (it is never
 * re-applied; the resolution is evidence).
 */
async function processStream(context: ClubContext, streamId: string) {
  for (;;) {
    const stream = await prisma.deviceSessionStream.findUniqueOrThrow({ where: { id: streamId } })
    const next = await prisma.syncOperation.findUnique({
      where: { streamId_sequence: { streamId, sequence: stream.contiguousSequence + 1n } },
    })
    if (!next) return stream
    let settled = next
    if (next.state === 'received' || next.state === 'waiting') {
      const session = await prisma.queueSession.findUniqueOrThrow({ where: { id: next.sessionId } })
      const run = DISPATCH[next.commandKind]
      if (!run) settled = await settle(next, 'rejected', { rejectionCode: 'unknown_command' })
      else if (session.state === 'completed' && !AFTER_COMPLETION.has(next.commandKind))
        settled = await settle(next, 'rejected', { rejectionCode: 'session_finalized' })
      else
        try {
          await run(context, next.sessionId, next.id, next.payload as Record<string, unknown>)
          settled = await settle(next, 'accepted')
        } catch (error) {
          if (!(error instanceof ServiceError)) throw error
          if (error.code === 'conflict')
            settled = await settle(next, 'conflicted', {
              conflictCategory: next.commandKind.startsWith('match.') ? 'contradictory_decision' : 'revision_mismatch',
            })
          else settled = await settle(next, 'rejected', { rejectionCode: error.code })
        }
    }
    // A quarantined operation holds the prefix until every conflict naming it is resolved.
    if (settled.state === 'conflicted') {
      const open = await prisma.syncConflictOperation.count({
        where: { operationId: settled.id, conflict: { state: 'open' } },
      })
      if (open) return stream
    }
    await prisma.deviceSessionStream.updateMany({
      where: { id: streamId, contiguousSequence: stream.contiguousSequence },
      data: { contiguousSequence: stream.contiguousSequence + 1n, revision: { increment: 1 } },
    })
  }
}

/** Q-OFFLINE · upload: store envelopes, then process the contiguous prefix. */
export async function uploadOperations(
  context: ClubContext,
  input: { streamId: string; operations: UploadedOperation[] },
) {
  const { rejected } = await receive(context, input.streamId, input.operations)
  const stream = await processStream(context, input.streamId)
  const ids = input.operations.map((op) => op.operationId)
  const stored = await prisma.syncOperation.findMany({ where: { id: { in: ids }, streamId: input.streamId } })
  return { stream: streamDto(stream), receipts: stored.map(receiptDto), rejected }
}

/**
 * Q-OFFLINE · close stream: the device submits its final sequence and the digest over operations
 * 1..N (SHA-256 of the concatenated payload digests). Accepted only when the prefix is complete and
 * the digest matches; the server never fabricates a seal.
 */
export async function sealStream(
  context: ClubContext,
  input: { streamId: string; finalSequence: string; digestHex: string },
) {
  const finalSequence = BigInt(input.finalSequence)
  return prisma.$transaction(async (tx) => {
    const stream = await lockStream(tx, context, input.streamId)
    if (stream.state === 'sealed') {
      if (stream.sealedFinalSequence !== finalSequence) throw new ServiceError('conflict')
      return streamDto(stream)
    }
    if (stream.state !== 'open') throw new ServiceError('forbidden', { stream: 'This stream is closed.' })
    if (stream.contiguousSequence !== finalSequence || stream.highestReceivedSeq !== finalSequence)
      throw new ServiceError('conflict', { stream: 'Some changes have not arrived yet.' })
    const ops = await tx.syncOperation.findMany({
      where: { streamId: stream.id, sequence: { lte: finalSequence } },
      orderBy: { sequence: 'asc' },
      select: { payloadDigest: true },
    })
    const joined = new Uint8Array(ops.length * 32)
    ops.forEach((op, i) => joined.set(op.payloadDigest, i * 32))
    const digest = await sha256(joined)
    const given = Uint8Array.from(Buffer.from(input.digestHex, 'hex'))
    if (!sameBytes(digest, given)) throw new ServiceError('conflict', { stream: 'The change log does not match.' })
    const sealed = await tx.deviceSessionStream.update({
      where: { id: stream.id },
      data: {
        state: 'sealed',
        sealedFinalSequence: finalSequence,
        sealedDigest: digest,
        sealedAt: new Date(),
        revision: { increment: 1 },
      },
    })
    return streamDto(sealed)
  })
}

/**
 * Completeness for Session done: proven only when every stream ever enrolled for the session is
 * sealed with its whole prefix accepted or rejected, and there is no open conflict and no
 * unprocessed operation. An open (even unused) stream, a revoked stream's recorded tail, or a gap
 * keeps it unproven.
 */
export async function sessionCompleteness(tx: Tx, sessionId: string) {
  const [streams, openConflicts, pending] = await Promise.all([
    tx.deviceSessionStream.findMany({ where: { sessionId } }),
    tx.syncConflict.count({ where: { sessionId, state: 'open' } }),
    tx.syncOperation.count({ where: { sessionId, state: { in: ['received', 'waiting'] } } }),
  ])
  const unsealed = streams.filter(
    (s) => s.state === 'open' || (s.state === 'sealed' && s.contiguousSequence !== s.sealedFinalSequence),
  )
  return {
    proven: !unsealed.length && !openConflicts && !pending,
    openStreams: unsealed.length,
    openConflicts,
    pendingOperations: pending,
  }
}

/** Q-OFFLINE status: streams, open conflicts (without private evidence) and completeness. */
export async function readSyncStatus(context: ClubContext, sessionId: string) {
  const session = await prisma.queueSession.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: sessionId } },
  })
  if (!session) throw new ServiceError('not_found')
  return prisma.$transaction(async (tx) => {
    const streams = await tx.deviceSessionStream.findMany({ where: { sessionId }, orderBy: { enrolledAt: 'asc' } })
    const conflicts = await tx.syncConflict.findMany({
      where: { sessionId, state: 'open' },
      orderBy: { detectedAt: 'asc' },
      select: { id: true, category: true, detectedAt: true },
    })
    return {
      streams: streams.map(streamDto),
      conflicts: conflicts.map((c) => ({ id: c.id, category: c.category, detectedAt: toIso(c.detectedAt) })),
      completeness: await sessionCompleteness(tx, sessionId),
    }
  })
}

/**
 * Resolves a conflict with evidence (proposal pending #246: the club account, online, on its own
 * unfinalized session). Resolution never changes a permanent decision or replays an operation; a
 * change the operator still wants is made as a new online command.
 */
export async function resolveConflict(
  context: ClubContext,
  input: { sessionId: string; conflictId: string; deviceId?: string | null; note: string },
) {
  return prisma.$transaction(async (tx) => {
    const session = await lockSession(tx, context, input.sessionId)
    await requireSessionAccess(context, session)
    if (session.state === 'completed' || session.state === 'invalid')
      throw new ServiceError('invalid', { state: 'This session is closed.' })
    const conflict = await tx.syncConflict.findUnique({ where: { id: input.conflictId } })
    if (!conflict || conflict.sessionId !== session.id) throw new ServiceError('not_found')
    if (conflict.state === 'resolved') return { id: conflict.id, state: conflict.state }
    if (!input.note.trim()) throw new ServiceError('invalid', { note: 'Say what you checked.' })
    const resolved = await tx.syncConflict.update({
      where: { id: conflict.id },
      data: {
        state: 'resolved',
        resolvedAt: new Date(),
        resolvedByDeviceId: input.deviceId ?? null,
        resolutionEvidence: { version: 1, note: input.note.trim() },
        revision: { increment: 1 },
      },
    })
    return { id: resolved.id, state: resolved.state }
  })
}

/** Re-runs processing for every stream of a session, e.g. after a conflict is resolved or a crash. */
export async function resumeSessionStreams(context: ClubContext, sessionId: string) {
  const streams = await prisma.deviceSessionStream.findMany({
    where: { clubId: context.clubId, sessionId, state: { in: ['open', 'sealed'] } },
    select: { id: true },
  })
  const out = []
  for (const { id } of streams) out.push(streamDto(await processStream(context, id)))
  return out
}
