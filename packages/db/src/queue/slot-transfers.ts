import 'server-only'
import { isRtrId, normalizeRtrId } from '@rotra/data/player/rtr-id'
import {
  TRANSFER_ALREADY_DECIDED_ERROR,
  TRANSFER_ALREADY_PENDING_ERROR,
  TRANSFER_NOT_CONFIRMED_ERROR,
  TRANSFER_NOT_FOUND_ERROR,
  TRANSFER_RTR_ID_ERROR,
  TRANSFER_SENDER_GONE_ERROR,
  TRANSFER_STARTED_ERROR,
  TRANSFER_WITHDRAWN_TOAST,
  transferApprovedToast,
  transferRecipientBlock,
  transferRecipientConfirmedError,
  transferRejectedToast,
  transferSentToast,
} from '@rotra/data/slot-transfer/slotTransfer.rules'
import type { ClubContext, PlayerContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { QueueSession } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { toIso } from '../service/serialize'
import { clubPlayerForProfile } from './session-roster'
import {
  derivedId,
  LIVE_ENTRY,
  levelCodeFor,
  levelIdFor,
  lockSession,
  mapDatabaseError,
  orderedWaitlist,
  promoteWaiter,
  recomputeMinimum,
  requireSessionAccess,
  type Tx,
  touchSession,
} from './session-store'

/**
 * Transfer my slot (#1011, epic #1009, D-2026-11-22-03), the same rules as the mock
 * (`@rotra/data/slot-transfer`): a confirmed signed-in Player asks, before Start, to hand their slot
 * to a registered ROTRA player found by exact RTR ID; the Queue Master approves or rejects it in
 * Requests. Every write runs on the locked session row (`lockSession`, `FOR UPDATE`) and locks the
 * transfer row, so two approvals, an approval racing a Start, or two requests for one slot cannot
 * interleave; the partial unique index (one pending per slot) and the final-row trigger are the
 * database backstops. Start expires pending transfers and Cancel session cancels them
 * (`closePendingSlotTransfers`). ROTRA moves no money: the sender's payment mark is never touched.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function rethrow(error: unknown): never {
  if (error instanceof ServiceError) throw error
  mapDatabaseError(error)
}

/** Start (`expired`) and Cancel session (`cancelled`) close every pending transfer of the session. */
export function closePendingSlotTransfers(
  tx: Tx,
  sessionId: string,
  status: 'expired' | 'cancelled',
  now = new Date(),
) {
  return tx.sessionSlotTransfer.updateMany({
    where: { sessionId, status: 'pending' },
    data: { status, decidedAt: now },
  })
}

async function lockTransfer(tx: Tx, sessionId: string, transferId: string) {
  if (!UUID.test(transferId)) throw new ServiceError('not_found')
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "session_slot_transfers"
    WHERE "id" = ${transferId}::uuid AND "session_id" = ${sessionId}::uuid
    FOR UPDATE`
  if (!rows.length) throw new ServiceError('not_found')
  return tx.sessionSlotTransfer.findUniqueOrThrow({ where: { id: transferId } })
}

/** The Player's live roster entry in this session (the slot they would transfer). */
async function liveEntryOf(tx: Tx, sessionId: string, playerId: string) {
  return tx.sessionPlayer.findFirst({
    where: { sessionId, ...LIVE_ENTRY, clubPlayer: { playerId } },
    select: { id: true, clubPlayerId: true, nameSnapshot: true, confirmedAt: true },
  })
}

async function senderEntry(tx: Tx, session: QueueSession, playerId: string) {
  if (session.state !== 'prepared')
    throw new ServiceError('invalid', { state: TRANSFER_STARTED_ERROR })
  const entry = await liveEntryOf(tx, session.id, playerId)
  if (!entry) throw new ServiceError('invalid', { player: TRANSFER_NOT_CONFIRMED_ERROR })
  return entry
}

/**
 * The recipient by exact RTR ID: a registered (claimed) ROTRA player listed in Player Information.
 * Refused for the sender themselves and for anyone already confirmed in this session; a waitlisted
 * recipient is allowed and reports their place.
 */
async function recipientFor(tx: Tx, session: QueueSession, senderPlayerId: string, rtrId: string) {
  if (!isRtrId(rtrId)) throw new ServiceError('invalid', { rtrId: TRANSFER_RTR_ID_ERROR })
  const allocation = await tx.playerIdAllocation.findUnique({
    where: { rtrId: normalizeRtrId(rtrId) },
    select: {
      rtrId: true,
      player: {
        select: {
          id: true,
          fullName: true,
          nickname: true,
          avatarRef: true,
          profileState: true,
          hiddenFromDirectory: true,
        },
      },
    },
  })
  const player = allocation?.player
  if (
    !allocation ||
    !player ||
    player.profileState !== 'claimed' ||
    (player.hiddenFromDirectory && player.id !== senderPlayerId)
  )
    throw new ServiceError('not_found', { rtrId: TRANSFER_NOT_FOUND_ERROR })
  const confirmed = await liveEntryOf(tx, session.id, player.id)
  const block = transferRecipientBlock({
    senderPlayerId,
    recipientPlayerId: player.id,
    recipientName: player.fullName,
    recipientConfirmed: !!confirmed,
  })
  if (block) throw new ServiceError('conflict', { rtrId: block })
  const { index } = await waitlistPlaceOf(tx, session, player.id)
  return {
    playerId: player.id,
    fullName: player.fullName,
    nickname: player.nickname,
    rtrId: allocation.rtrId,
    picture: player.avatarRef,
    waitlistPosition: index >= 0 ? index + 1 : null,
  }
}

/** The Player's place on this session's waitlist (0-based `index`, -1 when not waiting). */
async function waitlistPlaceOf(tx: Tx, session: QueueSession, playerId: string) {
  const saved = await tx.clubPlayer.findMany({
    where: { clubId: session.clubId, playerId },
    select: { id: true },
  })
  const ids = new Set(saved.map((p) => p.id))
  const waitlist = await orderedWaitlist(tx, session.id)
  const index = waitlist.findIndex((w) => ids.has(w.clubPlayerId))
  return { index, entry: waitlist[index] ?? null }
}

async function sessionForSlug(slug: string) {
  const found = await prisma.queueSession.findUnique({
    where: { publicSlug: slug },
    select: { id: true, clubId: true },
  })
  if (!found) throw new ServiceError('not_found')
  return found
}

// ---------- Signed-in Player (Player app routes) ----------

/** **Find** on the Transfer my slot sheet: the recipient preview in the `TransferRecipient` shape. */
export async function findTransferRecipient(context: PlayerContext, slug: string, rtrId: string) {
  const found = await sessionForSlug(slug)
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.queueSession.findUniqueOrThrow({ where: { id: found.id } })
      await senderEntry(tx, session, context.playerId)
      return recipientFor(tx, session, context.playerId, rtrId)
    })
  } catch (error) {
    rethrow(error)
  }
}

/**
 * **Send transfer request**: one pending transfer per slot (409 when one is already pending).
 * Repeat-safe on the client's `transferId`: a retry by the same sender returns the saved request.
 */
export async function requestSlotTransfer(
  context: PlayerContext,
  slug: string,
  input: { transferId: string; rtrId: string },
) {
  if (!UUID.test(input.transferId)) throw new ServiceError('invalid')
  const found = await sessionForSlug(slug)
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await lockSession(tx, found, found.id)
      const saved = await tx.sessionSlotTransfer.findUnique({
        where: { id: input.transferId },
        select: { senderPlayerId: true, recipientPlayer: { select: { fullName: true } } },
      })
      if (saved) {
        if (saved.senderPlayerId !== context.playerId) throw new ServiceError('conflict')
        return {
          transferId: input.transferId,
          message: transferSentToast(saved.recipientPlayer?.fullName ?? ''),
        }
      }
      const entry = await senderEntry(tx, session, context.playerId)
      const pending = await tx.sessionSlotTransfer.findFirst({
        where: { senderSessionPlayerId: entry.id, status: 'pending' },
        select: { id: true },
      })
      if (pending) throw new ServiceError('conflict', { player: TRANSFER_ALREADY_PENDING_ERROR })
      const recipient = await recipientFor(tx, session, context.playerId, input.rtrId)
      await tx.sessionSlotTransfer.create({
        data: {
          id: input.transferId,
          clubId: session.clubId,
          sessionId: session.id,
          senderSessionPlayerId: entry.id,
          senderClubPlayerId: entry.clubPlayerId,
          senderPlayerId: context.playerId,
          recipientPlayerId: recipient.playerId,
          requestedAt: new Date(),
        },
      })
      await touchSession(tx, session)
      return { transferId: input.transferId, message: transferSentToast(recipient.fullName) }
    })
  } catch (error) {
    rethrow(error)
  }
}

/** **Withdraw request** on the sender's own pending transfer; the slot stays theirs. */
export async function withdrawSlotTransfer(context: PlayerContext, slug: string) {
  const found = await sessionForSlug(slug)
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await lockSession(tx, found, found.id)
      const entry = await senderEntry(tx, session, context.playerId)
      const pending = await tx.sessionSlotTransfer.findFirst({
        where: { senderSessionPlayerId: entry.id, status: 'pending' },
        select: { id: true },
      })
      if (!pending)
        throw new ServiceError('conflict', { player: 'This transfer request is already closed.' })
      await lockTransfer(tx, session.id, pending.id)
      await tx.sessionSlotTransfer.update({
        where: { id: pending.id },
        data: { status: 'withdrawn', decidedAt: new Date(), withdrawnByPlayerId: context.playerId },
      })
      await touchSession(tx, session)
      return { transferId: pending.id, message: TRANSFER_WITHDRAWN_TOAST }
    })
  } catch (error) {
    rethrow(error)
  }
}

/** My night: the Player's own pending transfer on this roster entry, in the `MySlotTransfer` shape. */
export async function myPendingSlotTransfer(tx: Tx, sessionPlayerId: string) {
  const t = await tx.sessionSlotTransfer.findFirst({
    where: { senderSessionPlayerId: sessionPlayerId, status: 'pending' },
    select: {
      id: true,
      requestedAt: true,
      recipientPlayer: { select: { fullName: true, idAllocation: { select: { rtrId: true } } } },
    },
  })
  if (!t?.recipientPlayer) return null
  return {
    id: t.id,
    recipientName: t.recipientPlayer.fullName,
    recipientRtrId: t.recipientPlayer.idAllocation?.rtrId ?? '',
    at: toIso(t.requestedAt),
  }
}

// ---------- Queue Master (Queue app routes) ----------

/**
 * Requests › **Slot transfers · N**: the session's pending transfers whose sender still holds the
 * slot, oldest first, in the `SlotTransferView` shape with ISO times. Empty once the session left
 * Prepared (Start expired them).
 */
export async function pendingSlotTransferViews(tx: Tx, session: QueueSession) {
  if (session.state !== 'prepared') return []
  const rows = await tx.sessionSlotTransfer.findMany({
    where: { sessionId: session.id, status: 'pending', senderEntry: LIVE_ENTRY },
    orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      senderSessionPlayerId: true,
      requestedAt: true,
      senderEntry: { select: { nameSnapshot: true, clubPlayer: { select: { nickname: true } } } },
      recipientPlayer: {
        select: { id: true, fullName: true, idAllocation: { select: { rtrId: true } } },
      },
    },
  })
  const views = []
  for (const t of rows) {
    const recipient = t.recipientPlayer
    if (!recipient) continue
    const { index, entry } = await waitlistPlaceOf(tx, session, recipient.id)
    const saved =
      index >= 0
        ? null
        : await tx.clubPlayer.findFirst({
            where: { clubId: session.clubId, playerId: recipient.id, removedAt: null },
            select: {
              assessments: {
                orderBy: { assessedAt: 'desc' },
                take: 1,
                select: { skillLevelId: true },
              },
            },
          })
    views.push({
      id: t.id,
      sessionId: session.id,
      pid: t.senderSessionPlayerId,
      senderName: t.senderEntry.nameSnapshot,
      senderNickname: t.senderEntry.clubPlayer.nickname,
      recipientPlayerId: recipient.id,
      recipientName: recipient.fullName,
      recipientRtrId: recipient.idAllocation?.rtrId ?? '',
      recipientWaitlistPosition: index >= 0 ? index + 1 : null,
      suggestedLevel: levelCodeFor(
        entry ? entry.skillLevelId : (saved?.assessments[0]?.skillLevelId ?? null),
      ),
      at: toIso(t.requestedAt),
    })
  }
  return views
}

async function decision<T>(
  context: ClubContext,
  sessionId: string,
  transferId: string,
  decide: (
    tx: Tx,
    session: QueueSession,
    transfer: Awaited<ReturnType<typeof lockTransfer>>,
  ) => Promise<T>,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await lockSession(tx, context, sessionId)
      await requireSessionAccess(context, session, tx)
      const transfer = await lockTransfer(tx, session.id, transferId)
      if (transfer.status !== 'pending')
        throw new ServiceError('conflict', { transfer: TRANSFER_ALREADY_DECIDED_ERROR })
      if (session.state !== 'prepared')
        throw new ServiceError('conflict', { transfer: TRANSFER_STARTED_ERROR })
      return decide(tx, session, transfer)
    })
  } catch (error) {
    rethrow(error)
  }
}

/**
 * **Approve** with the level the Queue Master chose. One transaction on the locked session: the
 * sender's entry is released (reason `transferred`; its paid mark and assessments stay on it), the
 * recipient's saved player is found or saved, their waitlist row (or a new one) gets the level and
 * is promoted into a slot that keeps the sender's place in slot order. The live count is unchanged
 * and the recipient ends with exactly one entry. Refused when the recipient got a slot meanwhile.
 * The recipient's pending join request and the sender's open drop-out notice close.
 */
export function approveSlotTransfer(
  context: ClubContext,
  sessionId: string,
  input: { transferId: string; level: string },
) {
  const skillLevelId = levelIdFor(input.level)
  return decision(context, sessionId, input.transferId, async (tx, session, transfer) => {
    const sender = await tx.sessionPlayer.findUnique({
      where: { id: transfer.senderSessionPlayerId },
    })
    if (!sender || sender.releasedAt || sender.noShowAt)
      throw new ServiceError('conflict', { transfer: TRANSFER_SENDER_GONE_ERROR })
    const recipientId = transfer.recipientPlayerId
    if (!recipientId) throw new ServiceError('conflict', { transfer: TRANSFER_NOT_FOUND_ERROR })
    const recipient = await tx.player.findUniqueOrThrow({
      where: { id: recipientId },
      select: { fullName: true },
    })
    if (await liveEntryOf(tx, session.id, recipientId))
      throw new ServiceError('conflict', {
        transfer: transferRecipientConfirmedError(recipient.fullName),
      })
    const now = new Date()
    const operationId = await derivedId(transfer.id, 'approve')
    const { clubPlayer } = await clubPlayerForProfile(tx, context, operationId, recipientId, now)
    await tx.sessionPlayer.update({
      where: { id: sender.id },
      data: { releasedAt: now, releaseReason: 'transferred', revision: { increment: 1 } },
    })
    const waiting = await tx.sessionWaitlistEntry.findUnique({
      where: { sessionId_clubPlayerId: { sessionId: session.id, clubPlayerId: clubPlayer.id } },
    })
    const waiter = waiting
      ? await tx.sessionWaitlistEntry.update({ where: { id: waiting.id }, data: { skillLevelId } })
      : await tx.sessionWaitlistEntry.create({
          data: {
            id: await derivedId(operationId, 'waitlist'),
            clubId: context.clubId,
            sessionId: session.id,
            clubPlayerId: clubPlayer.id,
            skillLevelId,
            addedAt: now,
          },
        })
    const promoted = await promoteWaiter(tx, context, session, waiter, operationId, now)
    // The recipient takes the sender's place in slot order (first come, first served).
    await tx.sessionPlayer.update({
      where: { id: promoted.id },
      data: { confirmedAt: sender.confirmedAt },
    })
    await tx.sessionJoinRequest.updateMany({
      where: { sessionId: session.id, playerId: recipientId, status: 'pending' },
      data: { status: 'closed', decidedAt: now },
    })
    await tx.sessionDropOutNotice.updateMany({
      where: { sessionPlayerId: sender.id, status: 'open' },
      data: { status: 'closed', closedAt: now },
    })
    await tx.sessionSlotTransfer.update({
      where: { id: transfer.id },
      data: {
        status: 'approved',
        decidedAt: now,
        recipientClubPlayerId: clubPlayer.id,
        recipientSessionPlayerId: promoted.id,
        recipientWasWaitlisted: !!waiting,
      },
    })
    await recomputeMinimum(tx, await touchSession(tx, session))
    return {
      transferId: transfer.id,
      message: transferApprovedToast(sender.nameSnapshot, recipient.fullName),
    }
  })
}

/** **Reject**: the transfer closes; the sender keeps the slot and every payment record. */
export function rejectSlotTransfer(context: ClubContext, sessionId: string, transferId: string) {
  return decision(context, sessionId, transferId, async (tx, session, transfer) => {
    const sender = await tx.sessionPlayer.findUnique({
      where: { id: transfer.senderSessionPlayerId },
      select: { nameSnapshot: true },
    })
    await tx.sessionSlotTransfer.update({
      where: { id: transfer.id },
      data: { status: 'rejected', decidedAt: new Date() },
    })
    await touchSession(tx, session)
    return {
      transferId: transfer.id,
      message: transferRejectedToast(sender?.nameSnapshot ?? 'The sender'),
    }
  })
}
