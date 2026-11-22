import { formatPeso } from '@rotra/schema/money'
import { MockError } from '../mock/errors'
import { queueMutation, sessionIn } from '../mock/transaction'
import { realRecordSessionRefund } from '../real/financials'
import { isRealDataMode } from '../real/mode'
import { sessionCostIn } from '../session-cost/fetchers'
import { amountDuePerHead } from '../session-cost/sessionCost.rules'
import { slotPaymentsIn } from '../slot-transfer/slotPayments'
import {
  fullRefundAmount,
  REFUND_CHANGED_ERROR,
  REFUND_NOT_CANCELLED_ERROR,
  REFUND_NOTHING_TO_REFUND_ERROR,
  sessionRefundToast,
} from './paymentRefund.rules'
import { receivedAmount } from './sessionPayment.rules'
import type { RecordSessionRefundInput } from './sessionPayment.types'

/**
 * #1014 · **Record refund** on a cancelled session's **Refund everyone who paid** list (owner
 * decision 2026-11-22, #1015; D-2026-11-22-06). ROTRA moves no money: this records that the Queue
 * Master handed the player's whole cash back outside ROTRA. One append-only refund per player,
 * idempotent (recording it again changes nothing); the payment marks are never changed. Online only.
 */
export function recordSessionRefund(input: RecordSessionRefundInput) {
  if (isRealDataMode()) return realRecordSessionRefund(input)
  return queueMutation({ area: 'Payments', onlineOnly: true }, (s) => {
    const session = sessionIn(s, input.sessionId)
    if (session.state !== 'cancelled') throw new MockError('conflict', REFUND_NOT_CANCELLED_ERROR)
    const entry = s.roster.find((r) => r.id === input.sessionPlayerId && r.sessionId === session.id)
    if (!entry) throw new MockError('permission', 'Player not in this session.')
    const amountDue = amountDuePerHead(sessionCostIn(s, session.id)?.estimate ?? null)
    const ledger = slotPaymentsIn(s, session.id, amountDue)
    // Recorded already (a repeated tap or retry): nothing changes, one refund per player.
    const done = ledger.refundOf(entry.id)
    if (done) return { data: null, text: sessionRefundToast(entry.nameSnapshot, done.amountMinor) }
    const amount = fullRefundAmount(receivedAmount(ledger.paymentOf(entry.id).mark, amountDue))
    if (amount <= 0) throw new MockError('conflict', REFUND_NOTHING_TO_REFUND_ERROR)
    if (input.expectedAmountMinor !== amount)
      throw new MockError('conflict', REFUND_CHANGED_ERROR(formatPeso(amount)))
    s.paymentRefunds = [
      ...(s.paymentRefunds ?? []),
      {
        id: crypto.randomUUID(),
        sessionId: session.id,
        sessionPlayerId: entry.id,
        reason: 'session_cancelled',
        transferId: null,
        amountMinor: amount,
        currency: 'PHP',
        refundedAt: Date.now(),
      },
    ]
    return { data: null, text: sessionRefundToast(entry.nameSnapshot, amount) }
  })
}
