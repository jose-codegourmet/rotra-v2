import { formatPeso } from '@rotra/schema/money'
import { flushSessionBatches } from '../batch/flushBatches'
import type { ClubPlayer } from '../club-player/clubPlayer.types'
import { closeStaleMatchRequests } from '../match-request/matchRequest.rules'
import { MockError } from '../mock/errors'
import type { MockState } from '../mock/store'
import { queueMutation, sessionIn } from '../mock/transaction'
import { PLAYING_LEVELS } from '../player/player.types'
import { playerSlot } from '../public-session/publicSession.rules'
import { promoteWaiter, recomputeMinimum } from '../queue-session/mutations'
import { slotCapacity } from '../queue-session/queueSession.rules'
import { isRealDataMode } from '../real/mode'
import {
  realApproveSlotTransfer,
  realRejectAndRefundSlotTransfer,
  realRejectSlotTransfer,
} from '../real/slot-transfer'
import { sessionCostIn } from '../session-cost/fetchers'
import { amountDuePerHead } from '../session-cost/sessionCost.rules'
import {
  firstEligibleWaiter,
  fullRefundAmount,
  REFUND_CHANGED_ERROR,
  REFUND_NOTHING_PAID_ERROR,
  transferRefundToast,
} from '../session-payment/paymentRefund.rules'
import { slotTransfersOf } from './closeSlotTransfers'
import { slotPaymentsIn } from './slotPayments'
import {
  TRANSFER_ALREADY_DECIDED_ERROR,
  TRANSFER_LEVEL_ERROR,
  TRANSFER_NOT_FOUND_ERROR,
  TRANSFER_SENDER_GONE_ERROR,
  TRANSFER_STARTED_ERROR,
  transferApprovedToast,
  transferRecipientConfirmedError,
  transferRejectedToast,
} from './slotTransfer.rules'
import type {
  ApproveSlotTransferInput,
  DecideSlotTransferInput,
  RejectAndRefundSlotTransferInput,
} from './slotTransfer.types'
import {
  holdingOf,
  TRANSFER_WAIVER_CHANGED_ERROR,
  transferSnapshot,
} from './transferAccounting.rules'

/**
 * The Queue Master's side of Transfer my slot (#1011, D-2026-11-22-03), in Requests beside the
 * drop-out notices: **Approve** hands the slot to the recipient in one write, **Reject** leaves the
 * sender's registration and payment exactly as they were. Before Start only. Real mode goes to the
 * Queue app's Route Handlers.
 */

function fail(text: string, kind: 'permission' | 'conflict' = 'permission'): never {
  throw new MockError(kind, text)
}

async function transferMutation<T>(
  sessionId: string,
  change: (s: MockState) => { data: T; text: string },
) {
  await flushSessionBatches(sessionId)
  return queueMutation({ area: 'Roster', sessionId }, (s) => {
    const result = change(s)
    recomputeMinimum(s, sessionId)
    closeStaleMatchRequests(s, sessionId)
    return result
  })
}

function pendingTransfer(s: MockState, input: DecideSlotTransferInput) {
  const session = sessionIn(s, input.sessionId)
  const t = slotTransfersOf(s).find((x) => x.id === input.transferId && x.sessionId === session.id)
  if (!t || t.status !== 'pending') fail(TRANSFER_ALREADY_DECIDED_ERROR, 'conflict')
  if (session.state !== 'prepared') fail(TRANSFER_STARTED_ERROR, 'conflict')
  const row = s.roster.find((r) => r.id === t.pid && r.sessionId === session.id)
  return { session, t, row }
}

/** The recipient's saved player in this club, saved as registered when new to the club. */
function recipientClubPlayer(s: MockState, clubId: string, playerId: string): ClubPlayer {
  const saved = s.clubPlayers.find(
    (p) => p.clubId === clubId && p.playerId === playerId && !p.removedAt,
  )
  if (saved) return saved
  const profile = s.players.find((p) => p.id === playerId)
  if (!profile) fail('Player not available.', 'conflict')
  const player: ClubPlayer = {
    id: crypto.randomUUID(),
    clubId,
    playerId,
    fullName: profile.fullName,
    nickname: profile.nickname,
    identity: 'registered',
    playingLevel: null,
    addedAt: Date.now(),
    joinedVia: 'session',
  }
  s.clubPlayers.push(player)
  return player
}

/**
 * **Approve** with the level the Queue Master chose for the recipient. In one write: the sender's
 * roster row goes, the recipient takes the slot in the same place in slot order (a waitlisted
 * recipient leaves the waitlist; nobody else moves), so the roster count is unchanged. Refused when
 * the recipient got a slot meanwhile. #1013: the same write snapshots the slot's money on the
 * transfer (cash collected so far, earlier waivers and the automatic waiver of what it still owed),
 * so the recipient is Paid in Full and owes ₱0; no payment mark is written or changed (the sender's
 * stays as recorded). Refused when the waiver differs from the one the Queue Master was shown. The
 * recipient's own pending join request and the sender's open drop-out notice close.
 */
export function approveSlotTransfer(input: ApproveSlotTransferInput) {
  if (isRealDataMode()) return realApproveSlotTransfer(input)
  return transferMutation(input.sessionId, (s) => {
    const { session, t, row } = pendingTransfer(s, input)
    if (!row) fail(TRANSFER_SENDER_GONE_ERROR, 'conflict')
    if (!PLAYING_LEVELS.includes(input.level)) fail(TRANSFER_LEVEL_ERROR)
    // A transfer link nobody has claimed (#1012) has no recipient to approve.
    const recipientPlayerId = t.recipientPlayerId
    if (!recipientPlayerId) fail(TRANSFER_NOT_FOUND_ERROR, 'conflict')
    const recipient = s.players.find((p) => p.id === recipientPlayerId)
    const name = recipient?.fullName ?? 'The recipient'
    const slot = playerSlot(s, session, recipientPlayerId)
    if (slot.roster) fail(transferRecipientConfirmedError(name), 'conflict')
    // #1013: the slot's money, taken before the slot changes hands. Collected cash never changes.
    const amountDue = amountDuePerHead(sessionCostIn(s, session.id)?.estimate ?? null)
    const ledger = slotPaymentsIn(s, session.id, amountDue)
    const payment = transferSnapshot(amountDue, holdingOf(ledger.paymentOf(row.id), amountDue))
    if (
      input.expectedWaiverMinor !== undefined &&
      input.expectedWaiverMinor !== payment.waivedMinor
    )
      fail(TRANSFER_WAIVER_CHANGED_ERROR(formatPeso(payment.waivedMinor)), 'conflict')
    const clubPlayer = recipientClubPlayer(s, session.clubId, recipientPlayerId)
    const now = Date.now()
    // The slot changes hands: release the sender's row, then promote the recipient into it.
    s.roster = s.roster.filter((r) => r.id !== row.id)
    const waiting = slot.waitlist ?? {
      id: crypto.randomUUID(),
      sessionId: session.id,
      clubPlayerId: clubPlayer.id,
      level: input.level,
      addedAt: now,
    }
    waiting.level = input.level
    if (!slot.waitlist) s.waitlist.push(waiting)
    // The recipient keeps the sender's place in slot order (confirmedAt).
    promoteWaiter(s, waiting, row.confirmedAt)
    const taken = s.roster.find(
      (r) => r.sessionId === session.id && r.clubPlayerId === waiting.clubPlayerId,
    )
    for (const r of s.joinRequests)
      if (
        r.sessionId === session.id &&
        r.playerId === recipientPlayerId &&
        r.status === 'pending'
      ) {
        r.status = 'closed'
        r.decidedAt = now
      }
    for (const d of s.dropOutNotices)
      if (d.pid === row.id && d.status === 'open') {
        d.status = 'closed'
        d.closedAt = now
      }
    t.status = 'approved'
    t.decidedAt = now
    t.recipientClubPlayerId = waiting.clubPlayerId
    t.recipientPid = taken?.id ?? null
    t.recipientWasWaitlisted = !!slot.waitlist
    t.payment = payment
    return { data: null, text: transferApprovedToast(row.nameSnapshot, name, payment.waivedMinor) }
  })
}

/** **Reject**: the request closes; the sender keeps the slot and every payment record. */
export function rejectSlotTransfer(input: DecideSlotTransferInput) {
  if (isRealDataMode()) return realRejectSlotTransfer(input)
  return transferMutation(input.sessionId, (s) => {
    const { t, row } = pendingTransfer(s, input)
    // A transfer link nobody has claimed (#1012) is not in Requests; the sender cancels it instead.
    if (!t.recipientPlayerId) fail(TRANSFER_NOT_FOUND_ERROR, 'conflict')
    t.status = 'rejected'
    t.decidedAt = Date.now()
    const sender = row?.nameSnapshot ?? s.players.find((p) => p.id === t.senderPlayerId)?.fullName
    return { data: null, text: transferRejectedToast(sender ?? 'The sender') }
  })
}

/**
 * **Reject and refund** (#1014, D-2026-11-22-06): the transfer is rejected and the Queue Master
 * records that they handed the sender back the slot's **whole** cash outside ROTRA (full refunds
 * only; a waiver is never refunded). In one write: an append-only refund record (the payment marks
 * stay exactly as they are), the sender's registration is cancelled (their roster row goes; their
 * open drop-out notice closes) and, while a slot is open, the first waitlisted person with a level
 * takes it (FIFO, the waitlist's own order). Capacity never changes. Refused when nothing was paid
 * (plain Reject instead) and when the amount differs from the one the Queue Master confirmed.
 */
export function rejectAndRefundSlotTransfer(input: RejectAndRefundSlotTransferInput) {
  if (isRealDataMode()) return realRejectAndRefundSlotTransfer(input)
  return transferMutation(input.sessionId, (s) => {
    const { session, t, row } = pendingTransfer(s, input)
    if (!row) fail(TRANSFER_SENDER_GONE_ERROR, 'conflict')
    // A transfer link nobody has claimed (#1012) is not in Requests; the sender cancels it instead.
    if (!t.recipientPlayerId) fail(TRANSFER_NOT_FOUND_ERROR, 'conflict')
    const amountDue = amountDuePerHead(sessionCostIn(s, session.id)?.estimate ?? null)
    const ledger = slotPaymentsIn(s, session.id, amountDue)
    const amount = fullRefundAmount(holdingOf(ledger.paymentOf(row.id), amountDue)?.cashMinor ?? 0)
    if (amount <= 0) fail(REFUND_NOTHING_PAID_ERROR, 'conflict')
    if (input.expectedRefundMinor !== undefined && input.expectedRefundMinor !== amount)
      fail(REFUND_CHANGED_ERROR(formatPeso(amount)), 'conflict')
    const now = Date.now()
    t.status = 'rejected'
    t.decidedAt = now
    s.paymentRefunds = [
      ...(s.paymentRefunds ?? []),
      {
        id: crypto.randomUUID(),
        sessionId: session.id,
        sessionPlayerId: row.id,
        reason: 'transfer_rejected',
        transferId: t.id,
        amountMinor: amount,
        currency: 'PHP',
        refundedAt: now,
      },
    ]
    // The sender's registration is cancelled: the slot opens.
    s.roster = s.roster.filter((r) => r.id !== row.id)
    for (const d of s.dropOutNotices)
      if (d.pid === row.id && d.status === 'open') {
        d.status = 'closed'
        d.closedAt = now
      }
    const capacity = slotCapacity(
      s.courts.filter((c) => c.sessionId === session.id && !c.removedAt).length,
      session.playersPerCourt,
    )
    const open = capacity - s.roster.filter((r) => r.sessionId === session.id).length
    const waiting = s.waitlist
      .filter((w) => w.sessionId === session.id)
      .sort((a, b) => a.addedAt - b.addedAt)
    const next = firstEligibleWaiter(waiting, open, (w) => !!w.level)
    let promotedName: string | null = null
    if (next) {
      promoteWaiter(s, next, now)
      promotedName = s.clubPlayers.find((p) => p.id === next.clubPlayerId)?.fullName ?? null
    }
    return { data: null, text: transferRefundToast(row.nameSnapshot, amount, promotedName) }
  })
}
