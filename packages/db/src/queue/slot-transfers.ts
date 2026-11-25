import 'server-only'
import { isRtrId, normalizeRtrId } from '@rotra/data/player/rtr-id'
import { maskPublicName } from '@rotra/data/public-session/rules'
import { amountDuePerHead } from '@rotra/data/session-cost/rules'
import {
  firstEligibleWaiter,
  fullRefundAmount,
  REFUND_CHANGED_ERROR,
  REFUND_NOTHING_PAID_ERROR,
  transferRefundToast,
} from '@rotra/data/session-payment/refund-rules'
import {
  isTransferLinkToken,
  TRANSFER_ALREADY_DECIDED_ERROR,
  TRANSFER_ALREADY_PENDING_ERROR,
  TRANSFER_CLAIM_CLOSED_ERROR,
  TRANSFER_CLAIM_CONFIRMED_ERROR,
  TRANSFER_CLAIM_WITHDRAWN_TOAST,
  TRANSFER_CLAIMED_TOAST,
  TRANSFER_LINK_CANCELLED_TOAST,
  TRANSFER_LINK_CLAIMED_ERROR,
  TRANSFER_LINK_CLOSED_ERROR,
  TRANSFER_LINK_CREATED_TOAST,
  TRANSFER_NOT_CONFIRMED_ERROR,
  TRANSFER_NOT_FOUND_ERROR,
  TRANSFER_RTR_ID_ERROR,
  TRANSFER_SENDER_GONE_ERROR,
  TRANSFER_STARTED_ERROR,
  TRANSFER_WITHDRAWN_TOAST,
  transferApprovedToast,
  transferLinkClaimError,
  transferLinkState,
  transferRecipientBlock,
  transferRecipientConfirmedError,
  transferRejectedToast,
  transferSentToast,
} from '@rotra/data/slot-transfer/slotTransfer.rules'
import type {
  SlotTransferStatus,
  TransferLinkView,
} from '@rotra/data/slot-transfer/slotTransfer.types'
import {
  holdingOf,
  TRANSFER_WAIVER_CHANGED_ERROR,
  transferSnapshot,
} from '@rotra/data/slot-transfer/transferAccounting.rules'
import { formatPeso } from '@rotra/schema/money'
import type { ClubContext, PlayerContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { QueueSession } from '../generated/prisma/client'
import { activateClubMembership } from '../player/my-clubs'
import { ServiceError } from '../service/errors'
import { toIso } from '../service/serialize'
import { estimateFor } from './financials'
import { clubPlayerForProfile } from './session-roster'
import {
  capacityOf,
  derivedId,
  LIVE_ENTRY,
  levelCodeFor,
  levelIdFor,
  liveRoster,
  lockSession,
  mapDatabaseError,
  orderedWaitlist,
  promoteWaiter,
  recomputeMinimum,
  requireSessionAccess,
  type Tx,
  touchSession,
} from './session-store'
import { slotLedger } from './transfer-accounting'

/**
 * Transfer my slot (#1011, epic #1009, D-2026-11-22-03), the same rules as the mock
 * (`@rotra/data/slot-transfer`): a confirmed signed-in Player asks, before Start, to hand their slot
 * to a registered ROTRA player found by exact RTR ID; the Queue Master approves or rejects it in
 * Requests. Every write runs on the locked session row (`lockSession`, `FOR UPDATE`) and locks the
 * transfer row, so two approvals, an approval racing a Start, or two requests for one slot cannot
 * interleave; the partial unique index (one pending per slot) and the final-row trigger are the
 * database backstops. Start expires pending transfers and Cancel session cancels them
 * (`closePendingSlotTransfers`), which also ends every open transfer link (#1012): a link works
 * exactly while its transfer is pending. ROTRA moves no money: the sender's payment mark is never
 * touched; an approval snapshots the slot's money on the transfer row instead (#1013).
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
          archivedAt: true,
        },
      },
    },
  })
  const player = allocation?.player
  if (
    !allocation ||
    !player ||
    player.profileState !== 'claimed' ||
    player.archivedAt ||
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
      const locked = await lockTransfer(tx, session.id, pending.id)
      await tx.sessionSlotTransfer.update({
        where: { id: pending.id },
        data: { status: 'withdrawn', decidedAt: new Date(), withdrawnByPlayerId: context.playerId },
      })
      await touchSession(tx, session)
      // Cancel link (#1012) on a link nobody claimed; otherwise Withdraw request. Either way the
      // link stops working: it lives exactly as long as the pending row.
      const unclaimedLink = !!locked.linkTokenDigest && !locked.recipientPlayerId
      return {
        transferId: pending.id,
        message: unclaimedLink ? TRANSFER_LINK_CANCELLED_TOAST : TRANSFER_WITHDRAWN_TOAST,
      }
    })
  } catch (error) {
    rethrow(error)
  }
}

/**
 * My night: the Player's own pending transfer on this roster entry, in the `MySlotTransfer` shape.
 * A transfer link nobody has claimed yet (#1012) comes with no recipient.
 */
export async function myPendingSlotTransfer(tx: Tx, sessionPlayerId: string) {
  const t = await tx.sessionSlotTransfer.findFirst({
    where: { senderSessionPlayerId: sessionPlayerId, status: 'pending' },
    select: {
      id: true,
      requestedAt: true,
      linkTokenDigest: true,
      recipientPlayer: { select: { fullName: true, idAllocation: { select: { rtrId: true } } } },
    },
  })
  if (!t || (!t.recipientPlayer && !t.linkTokenDigest)) return null
  return {
    id: t.id,
    recipientName: t.recipientPlayer?.fullName ?? null,
    recipientRtrId: t.recipientPlayer ? (t.recipientPlayer.idAllocation?.rtrId ?? '') : null,
    viaLink: !!t.linkTokenDigest,
    at: toIso(t.requestedAt),
  }
}

// ---------- Transfer links (#1012, D-2026-11-22-04) ----------

/** SHA-256 of the token, the only form stored (like `player_claim_links.token_digest`). */
async function tokenDigest(token: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))
}

/** 32 random bytes in base64url (43 characters), like the registration claim links. */
function newLinkToken() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
}

/** The transfer whose link carries this token, in this session, or null. No lock. */
async function transferForToken(tx: Tx, sessionId: string, token: string) {
  if (!isTransferLinkToken(token)) return null
  const t = await tx.sessionSlotTransfer.findUnique({
    where: { linkTokenDigest: await tokenDigest(token) },
    select: { id: true, sessionId: true },
  })
  return t && t.sessionId === sessionId ? t : null
}

function linkState(
  session: QueueSession,
  t: { status: SlotTransferStatus; senderPlayerId: string; recipientPlayerId: string | null },
  viewerPlayerId: string | null,
) {
  return transferLinkState({
    status: t.status,
    sessionState: session.state,
    senderPlayerId: t.senderPlayerId,
    recipientPlayerId: t.recipientPlayerId,
    viewerPlayerId,
  })
}

/**
 * **Create a transfer link** on the Transfer my slot sheet, for a recipient with no ROTRA account: a
 * pending transfer with no recipient and the digest of a fresh token. The plaintext token is returned
 * once and never stored, so a lost link is cancelled and made again. One pending transfer per slot
 * (the partial unique index backs it), so a link and an RTR ID request never coexist.
 */
export async function createTransferLink(
  context: PlayerContext,
  slug: string,
  input: { transferId: string },
) {
  if (!UUID.test(input.transferId)) throw new ServiceError('invalid')
  const found = await sessionForSlug(slug)
  const token = newLinkToken()
  const digest = await tokenDigest(token)
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await lockSession(tx, found, found.id)
      const entry = await senderEntry(tx, session, context.playerId)
      const pending = await tx.sessionSlotTransfer.findFirst({
        where: { senderSessionPlayerId: entry.id, status: 'pending' },
        select: { id: true },
      })
      if (pending) throw new ServiceError('conflict', { player: TRANSFER_ALREADY_PENDING_ERROR })
      await tx.sessionSlotTransfer.create({
        data: {
          id: input.transferId,
          clubId: session.clubId,
          sessionId: session.id,
          senderSessionPlayerId: entry.id,
          senderClubPlayerId: entry.clubPlayerId,
          senderPlayerId: context.playerId,
          recipientPlayerId: null,
          linkTokenDigest: digest,
          requestedAt: new Date(),
        },
      })
      await touchSession(tx, session)
      return { transferId: input.transferId, token, message: TRANSFER_LINK_CREATED_TOAST }
    })
  } catch (error) {
    rethrow(error)
  }
}

/**
 * The transfer link card on the session page (`?transfer=<token>`), for anyone holding the link:
 * its state from this viewer's side (`viewerPlayerId` null when not signed in) and the sender's
 * masked name, as the public page masks names. An unknown or malformed token reads `closed` and
 * says nothing more. A read: no lock.
 */
export async function readTransferLink(
  viewerPlayerId: string | null,
  slug: string,
  token: string,
): Promise<TransferLinkView> {
  const closed: TransferLinkView = { state: 'closed', senderName: null, claimBlock: null }
  const found = await prisma.queueSession.findUnique({ where: { publicSlug: slug } })
  if (!found) return closed
  return prisma.$transaction(async (tx) => {
    const hit = await transferForToken(tx, found.id, token)
    if (!hit) return closed
    const t = await tx.sessionSlotTransfer.findUniqueOrThrow({
      where: { id: hit.id },
      select: {
        status: true,
        senderPlayerId: true,
        recipientPlayerId: true,
        senderEntry: { select: { nameSnapshot: true } },
      },
    })
    const state = linkState(found, t, viewerPlayerId)
    const confirmed =
      state === 'open' && viewerPlayerId ? await liveEntryOf(tx, found.id, viewerPlayerId) : null
    return {
      state,
      senderName: maskPublicName(t.senderEntry.nameSnapshot),
      claimBlock: confirmed ? TRANSFER_CLAIM_CONFIRMED_ERROR : null,
    }
  })
}

/**
 * **Claim this slot**: the first signed-in player to accept takes the link. On the locked session
 * and transfer rows, the claim is one conditional UPDATE (`recipient_player_id IS NULL`): a second
 * claimant, even one racing in another transaction, updates nothing and is told the link is
 * already claimed; the trigger refuses any later change of the recipient. The transfer then waits
 * for the Queue Master exactly like a request by RTR ID. Refused for the sender, for anyone already
 * confirmed here, and once the link closed (rejected, withdrawn, approved), the session started or
 * it was cancelled.
 */
export async function claimTransferLink(context: PlayerContext, slug: string, token: string) {
  const found = await sessionForSlug(slug)
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await lockSession(tx, found, found.id)
      const hit = await transferForToken(tx, session.id, token)
      if (!hit) throw new ServiceError('conflict', { transfer: TRANSFER_LINK_CLOSED_ERROR })
      const t = await lockTransfer(tx, session.id, hit.id)
      const refused = transferLinkClaimError(linkState(session, t, context.playerId))
      if (refused) throw new ServiceError('conflict', { transfer: refused })
      const sender = await tx.sessionPlayer.findUnique({
        where: { id: t.senderSessionPlayerId },
        select: { releasedAt: true, noShowAt: true },
      })
      if (!sender || sender.releasedAt || sender.noShowAt)
        throw new ServiceError('conflict', { transfer: TRANSFER_LINK_CLOSED_ERROR })
      if (await liveEntryOf(tx, session.id, context.playerId))
        throw new ServiceError('conflict', { transfer: TRANSFER_CLAIM_CONFIRMED_ERROR })
      const claimed = await tx.sessionSlotTransfer.updateMany({
        where: { id: t.id, status: 'pending', recipientPlayerId: null },
        data: { recipientPlayerId: context.playerId, claimedAt: new Date() },
      })
      if (claimed.count !== 1)
        throw new ServiceError('conflict', { transfer: TRANSFER_LINK_CLAIMED_ERROR })
      // #1018: signing up or in through a transfer link makes the claimant a member of the club
      // (create or reactivate the one membership row, no owner approval, no queue rights).
      await activateClubMembership(tx, context.playerId, session.clubId)
      await touchSession(tx, session)
      return { transferId: t.id, message: TRANSFER_CLAIMED_TOAST }
    })
  } catch (error) {
    rethrow(error)
  }
}

/**
 * **Withdraw claim**: the claimant gives the slot back before the Queue Master decides. The transfer
 * closes as `withdrawn` (by them) and the link stops working; the sender makes a new one.
 */
export async function withdrawTransferClaim(context: PlayerContext, slug: string, token: string) {
  const found = await sessionForSlug(slug)
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await lockSession(tx, found, found.id)
      const hit = await transferForToken(tx, session.id, token)
      if (!hit) throw new ServiceError('conflict', { transfer: TRANSFER_CLAIM_CLOSED_ERROR })
      const t = await lockTransfer(tx, session.id, hit.id)
      if (linkState(session, t, context.playerId) !== 'yours')
        throw new ServiceError('conflict', { transfer: TRANSFER_CLAIM_CLOSED_ERROR })
      await tx.sessionSlotTransfer.update({
        where: { id: t.id },
        data: { status: 'withdrawn', decidedAt: new Date(), withdrawnByPlayerId: context.playerId },
      })
      await touchSession(tx, session)
      return { transferId: t.id, message: TRANSFER_CLAIM_WITHDRAWN_TOAST }
    })
  } catch (error) {
    rethrow(error)
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
    // A transfer link nobody has claimed yet (#1012) has nobody to approve: not listed.
    where: {
      sessionId: session.id,
      status: 'pending',
      senderEntry: LIVE_ENTRY,
      recipientPlayerId: { not: null },
    },
    orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      senderSessionPlayerId: true,
      requestedAt: true,
      linkTokenDigest: true,
      senderEntry: { select: { nameSnapshot: true, clubPlayer: { select: { nickname: true } } } },
      recipientPlayer: {
        select: { id: true, fullName: true, idAllocation: { select: { rtrId: true } } },
      },
    },
  })
  // #1013: what Approve would record now, shown before approving (the same rule as the approval).
  const { estimate } = await estimateFor(tx, session)
  const amountDue = amountDuePerHead(estimate)
  const ledger = await slotLedger(tx, session.id)
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
      viaLink: !!t.linkTokenDigest,
      payment: transferSnapshot(
        amountDue,
        holdingOf(ledger.paymentOf(t.senderSessionPlayerId, amountDue), amountDue),
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
  input: { transferId: string; level: string; expectedWaiverMinor?: unknown },
) {
  const skillLevelId = levelIdFor(input.level)
  const expected = input.expectedWaiverMinor
  if (
    expected !== undefined &&
    expected !== null &&
    (typeof expected !== 'number' || !Number.isSafeInteger(expected) || expected < 0)
  )
    throw new ServiceError('invalid', { expectedWaiverMinor: 'Enter the waiver in centavos.' })
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
    // #1013: the slot's money, read before it changes hands: its cash collected so far (the
    // sender's own mark plus anything carried to them), earlier waivers and the automatic waiver.
    // No payment mark is written or changed; collected cash stays the same.
    const { estimate } = await estimateFor(tx, session)
    const amountDue = amountDuePerHead(estimate)
    const ledger = await slotLedger(tx, session.id)
    const payment = transferSnapshot(
      amountDue,
      holdingOf(ledger.paymentOf(sender.id, amountDue), amountDue),
    )
    if (typeof expected === 'number' && expected !== payment.waivedMinor)
      throw new ServiceError('conflict', {
        transfer: TRANSFER_WAIVER_CHANGED_ERROR(formatPeso(payment.waivedMinor)),
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
        amountDueMinor: payment.amountDueMinor,
        amountPaidMinor: payment.paidMinor,
        priorWaivedMinor: payment.priorWaivedMinor,
        waivedMinor: payment.waivedMinor,
        currency: 'PHP',
      },
    })
    await recomputeMinimum(tx, await touchSession(tx, session))
    return {
      transferId: transfer.id,
      message: transferApprovedToast(sender.nameSnapshot, recipient.fullName, payment.waivedMinor),
    }
  })
}

/** **Reject**: the transfer closes; the sender keeps the slot and every payment record. */
export function rejectSlotTransfer(context: ClubContext, sessionId: string, transferId: string) {
  return decision(context, sessionId, transferId, async (tx, session, transfer) => {
    // An unclaimed transfer link (#1012) is not in Requests; the sender cancels it instead.
    if (!transfer.recipientPlayerId)
      throw new ServiceError('conflict', { transfer: TRANSFER_NOT_FOUND_ERROR })
    const sender = await tx.sessionPlayer.findUnique({
      where: { id: transfer.senderSessionPlayerId },
      select: { nameSnapshot: true },
    })
    // Rejection ends a claimed link too: it worked only while pending (#1012).
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

/**
 * **Reject and refund** (#1014, D-2026-11-22-06): rejects the transfer and records a manual full
 * refund in one transaction on the locked session. ROTRA moves no money: the refund row records
 * that the Queue Master handed the sender the slot's **whole** cash back outside ROTRA (own cash
 * plus cash carried in by earlier transfers; never a waiver). The payment marks are not touched
 * (a trigger freezes them). The sender's registration is cancelled (entry released, reason
 * `refunded`; their open drop-out notice closes) and, while a slot is open, the first waitlisted
 * person with a level takes it, in waitlist order (FIFO, `promoteWaiter`). Capacity never changes.
 * Refused when nothing was paid (plain Reject instead) and when the amount differs from the one
 * the Queue Master confirmed.
 */
export function rejectAndRefundSlotTransfer(
  context: ClubContext,
  sessionId: string,
  input: { transferId: string; expectedRefundMinor?: unknown },
) {
  const expected = input.expectedRefundMinor
  if (
    expected !== undefined &&
    expected !== null &&
    (typeof expected !== 'number' || !Number.isSafeInteger(expected) || expected < 0)
  )
    throw new ServiceError('invalid', { expectedRefundMinor: 'Enter the refund in centavos.' })
  return decision(context, sessionId, input.transferId, async (tx, session, transfer) => {
    // An unclaimed transfer link (#1012) is not in Requests; the sender cancels it instead.
    if (!transfer.recipientPlayerId)
      throw new ServiceError('conflict', { transfer: TRANSFER_NOT_FOUND_ERROR })
    const sender = await tx.sessionPlayer.findUnique({
      where: { id: transfer.senderSessionPlayerId },
    })
    if (!sender || sender.releasedAt || sender.noShowAt)
      throw new ServiceError('conflict', { transfer: TRANSFER_SENDER_GONE_ERROR })
    // The slot's whole cash, read the same way as Approve's snapshot (#1013).
    const { estimate } = await estimateFor(tx, session)
    const amountDue = amountDuePerHead(estimate)
    const ledger = await slotLedger(tx, session.id)
    const amount = fullRefundAmount(
      holdingOf(ledger.paymentOf(sender.id, amountDue), amountDue)?.cashMinor ?? 0,
    )
    if (amount <= 0) throw new ServiceError('conflict', { transfer: REFUND_NOTHING_PAID_ERROR })
    if (typeof expected === 'number' && expected !== amount)
      throw new ServiceError('conflict', { transfer: REFUND_CHANGED_ERROR(formatPeso(amount)) })
    const now = new Date()
    // Rejection ends a claimed link too: it worked only while pending (#1012).
    await tx.sessionSlotTransfer.update({
      where: { id: transfer.id },
      data: { status: 'rejected', decidedAt: now },
    })
    await tx.sessionPaymentRefund.create({
      data: {
        id: await derivedId(transfer.id, 'refund'),
        clubId: context.clubId,
        sessionId: session.id,
        sessionPlayerId: sender.id,
        reason: 'transfer_rejected',
        slotTransferId: transfer.id,
        amountMinor: amount,
        refundedAt: now,
      },
    })
    await tx.sessionPlayer.update({
      where: { id: sender.id },
      data: { releasedAt: now, releaseReason: 'refunded', revision: { increment: 1 } },
    })
    await tx.sessionDropOutNotice.updateMany({
      where: { sessionPlayerId: sender.id, status: 'open' },
      data: { status: 'closed', closedAt: now },
    })
    const open = (await capacityOf(tx, session)) - (await liveRoster(tx, session.id)).length
    const next = firstEligibleWaiter(
      await orderedWaitlist(tx, session.id),
      open,
      (w) => w.skillLevelId != null,
    )
    let promotedName: string | null = null
    if (next) {
      const promoted = await promoteWaiter(
        tx,
        context,
        session,
        next,
        await derivedId(transfer.id, 'promote'),
        now,
      )
      promotedName = promoted.nameSnapshot
    }
    await recomputeMinimum(tx, await touchSession(tx, session))
    return {
      transferId: transfer.id,
      message: transferRefundToast(sender.nameSnapshot, amount, promotedName),
    }
  })
}
