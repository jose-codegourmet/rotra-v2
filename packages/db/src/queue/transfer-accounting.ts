import 'server-only'
import {
  type EntrySlotPayment,
  entrySlotPayment,
  type LedgerTransfer,
  slotTransferSteps,
} from '@rotra/data/slot-transfer/transferAccounting.rules'
import { toIso } from '../service/serialize'
import type { Tx } from './session-store'

/**
 * Slot transfer accounting over the database (#1013, D-2026-11-22-05), the same pure rules as the
 * mock (`@rotra/data/slot-transfer/transferAccounting.rules`). Every reader of payment marks (the
 * Payments read, the public payment status, Approve's waiver preview and the approval itself) goes
 * through `slotLedger`, so a slot's cash is counted once across a chain of transfers and a waiver is
 * never cash. Transfer rows are final once approved and the marks they froze are kept by a trigger
 * (`session_payment_marks_frozen_by_transfer`): the chain is append-only.
 */

type LedgerRow = LedgerTransfer & { fromName: string; toName: string; viaLink: boolean }

/** The session's approved transfers and payment marks, read once inside the caller's transaction. */
export async function slotLedger(tx: Tx, sessionId: string) {
  const rows = await tx.sessionSlotTransfer.findMany({
    where: { sessionId, status: 'approved' },
    orderBy: [{ decidedAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      senderSessionPlayerId: true,
      recipientSessionPlayerId: true,
      status: true,
      decidedAt: true,
      amountDueMinor: true,
      amountPaidMinor: true,
      priorWaivedMinor: true,
      waivedMinor: true,
      linkTokenDigest: true,
      senderEntry: { select: { nameSnapshot: true } },
      recipientEntry: { select: { nameSnapshot: true } },
    },
  })
  const marks = await tx.sessionPaymentMark.findMany({ where: { sessionId } })
  const transfers: LedgerRow[] = rows.map((t) => ({
    id: t.id,
    pid: t.senderSessionPlayerId,
    recipientPid: t.recipientSessionPlayerId,
    status: t.status,
    decidedAt: t.decidedAt?.getTime() ?? null,
    // A row approved before #1013 (local databases only) has no snapshot: it carries nothing.
    payment:
      t.amountPaidMinor === null
        ? null
        : {
            amountDueMinor: t.amountDueMinor,
            paidMinor: t.amountPaidMinor,
            priorWaivedMinor: t.priorWaivedMinor ?? 0,
            waivedMinor: t.waivedMinor ?? 0,
          },
    fromName: t.senderEntry.nameSnapshot,
    toName: t.recipientEntry?.nameSnapshot ?? 'A player',
    viaLink: !!t.linkTokenDigest,
  }))
  const byEntry = new Map(marks.map((m) => [m.sessionPlayerId, m]))
  const paymentOf = (entryId: string, amountDue: number | null): EntrySlotPayment => {
    const mark = byEntry.get(entryId)
    return entrySlotPayment({
      entryId,
      ownMark: mark ? { amountMinor: mark.amountMinor, markedAt: mark.markedAt.getTime() } : null,
      transfers,
      amountDue,
    })
  }
  return {
    transfers,
    markOf: (entryId: string) => byEntry.get(entryId),
    paymentOf,
    /**
     * A slot that came by transfer is Paid in Full through its history, and a mark frozen into a
     * transfer is part of it: neither may change through the Payments commands.
     */
    isLocked: (entryId: string) => {
      const payment = paymentOf(entryId, null)
      return payment.chain.length > 0 || payment.frozen
    },
    /** The slot came by transfer: it already reads Paid, so a paid tick is a no-op */
    isCarried: (entryId: string) => paymentOf(entryId, null).chain.length > 0,
    /** The Payments read's `transfer` (waivers and the chain, ISO times), or null for an own slot */
    transferOf: (payment: EntrySlotPayment) => {
      if (!payment.chain.length || !payment.mark) return null
      const steps = slotTransferSteps(payment.chain as LedgerRow[], (t) => ({
        fromName: t.fromName,
        toName: t.toName,
        viaLink: t.viaLink,
      }))
      return {
        waivedMinor: payment.mark.waivedMinor,
        steps: steps.map((step) => ({ ...step, approvedAt: toIso(new Date(step.approvedAt)) })),
      }
    },
  }
}
