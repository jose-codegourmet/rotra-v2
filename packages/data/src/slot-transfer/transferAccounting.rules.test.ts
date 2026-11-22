import { describe, expect, it } from 'vitest'
import { paymentTotals } from '../session-payment/sessionPayment.rules'
import {
  carriedHolding,
  entrySlotPayment,
  holdingOf,
  isMarkFrozen,
  type LedgerTransfer,
  slotTransferSteps,
  transferChain,
  transferSnapshot,
  transferWaiver,
  transferWaiverText,
} from './transferAccounting.rules'

const due = 90000

describe('the automatic waiver on approval (#1013)', () => {
  it('waives what a partly paid slot still owes', () => {
    expect(transferWaiver(due, { cashMinor: 50000, waivedMinor: 0 })).toBe(40000)
    expect(transferSnapshot(due, { cashMinor: 50000, waivedMinor: 0 })).toEqual({
      amountDueMinor: due,
      paidMinor: 50000,
      priorWaivedMinor: 0,
      waivedMinor: 40000,
    })
  })
  it('waives nothing for a fully paid or overpaid slot', () => {
    expect(transferWaiver(due, { cashMinor: 90000, waivedMinor: 0 })).toBe(0)
    expect(transferWaiver(due, { cashMinor: 95000, waivedMinor: 0 })).toBe(0)
  })
  it('waives the whole amount due for an unpaid slot (assumption, D-2026-11-22-05)', () => {
    expect(transferSnapshot(due, null)).toEqual({
      amountDueMinor: due,
      paidMinor: 0,
      priorWaivedMinor: 0,
      waivedMinor: 90000,
    })
  })
  it('waives nothing with no fee set', () => {
    expect(transferSnapshot(null, { cashMinor: 0, waivedMinor: 0 }).waivedMinor).toBe(0)
  })
  it('counts earlier waivers on a repeat transfer, so nothing is waived twice', () => {
    const first = transferSnapshot(due, { cashMinor: 50000, waivedMinor: 0 })
    const carried = carriedHolding(first)
    expect(carried).toEqual({ cashMinor: 50000, waivedMinor: 40000 })
    expect(transferSnapshot(due, carried)).toEqual({
      amountDueMinor: due,
      paidMinor: 50000,
      priorWaivedMinor: 40000,
      waivedMinor: 0,
    })
    // The fee rose by ₱100 between the approvals: only the new ₱100 is waived.
    expect(transferWaiver(100000, carried)).toBe(10000)
  })
  it('shows the waiver to the Queue Master before approving', () => {
    expect(transferWaiverText(transferSnapshot(due, { cashMinor: 50000, waivedMinor: 0 }))).toBe(
      '₱500 paid · ₱400 will be waived.',
    )
    expect(transferWaiverText(transferSnapshot(due, { cashMinor: 90000, waivedMinor: 0 }))).toBe(
      '₱900 paid · fully paid, nothing to waive.',
    )
    expect(transferWaiverText(transferSnapshot(null, null))).toBe('No fee set: nothing to waive.')
  })
})

// A → B → C: A paid ₱500 of ₱900; B paid nothing; C now holds the slot.
const t1: LedgerTransfer = {
  id: 't1',
  pid: 'A',
  recipientPid: 'B',
  status: 'approved',
  decidedAt: 100,
  payment: transferSnapshot(due, { cashMinor: 50000, waivedMinor: 0 }),
}
const t2: LedgerTransfer = {
  id: 't2',
  pid: 'B',
  recipientPid: 'C',
  status: 'approved',
  decidedAt: 200,
  payment: transferSnapshot(due, carriedHolding(t1.payment as NonNullable<typeof t1.payment>)),
}
const rejected: LedgerTransfer = {
  id: 'tx',
  pid: 'C',
  recipientPid: null,
  status: 'rejected',
  decidedAt: 300,
}
const transfers = [t2, rejected, t1]

describe('the immutable chain across repeat transfers', () => {
  it('reads the chain oldest first from the approved rows', () => {
    expect(transferChain(transfers, 'C').map((t) => t.id)).toEqual(['t1', 't2'])
    expect(transferChain(transfers, 'A')).toEqual([])
  })
  it('an entry that gave the slot away no longer holds the carried slot', () => {
    expect(transferChain(transfers, 'B')).toEqual([])
  })
  it('lists the original payer, each giver, amounts paid and waivers', () => {
    const steps = slotTransferSteps(transferChain(transfers, 'C'), (t) => ({
      fromName: t.pid,
      toName: t.recipientPid ?? '',
      viaLink: false,
    }))
    expect(steps).toEqual([
      {
        transferId: 't1',
        fromName: 'A',
        toName: 'B',
        paidByGiverMinor: 50000,
        slotPaidMinor: 50000,
        waivedMinor: 40000,
        amountDueMinor: due,
        approvedAt: 100,
        viaLink: false,
      },
      {
        transferId: 't2',
        fromName: 'B',
        toName: 'C',
        paidByGiverMinor: 0,
        slotPaidMinor: 50000,
        waivedMinor: 0,
        amountDueMinor: due,
        approvedAt: 200,
        viaLink: false,
      },
    ])
  })
})

describe('roster payments with transfers: collected cash never changes', () => {
  const marks: Record<string, { amountMinor: number | null; markedAt: number }> = {
    A: { amountMinor: 50000, markedAt: 50 },
    D: { amountMinor: 90000, markedAt: 60 },
  }
  const payment = (entryId: string) =>
    entrySlotPayment({ entryId, ownMark: marks[entryId], transfers, amountDue: due })

  it('the recipient is Paid in Full and owes ₱0, carrying the cash, not adding to it', () => {
    expect(payment('C').mark).toEqual({ amountMinor: 50000, waivedMinor: 40000 })
  })
  it("the sender's mark stays as recorded and is frozen into the slot", () => {
    expect(isMarkFrozen(transfers, 'A', marks.A)).toBe(true)
    expect(payment('A').frozen).toBe(true)
    expect(payment('A').mark).toBeNull()
    expect(marks.A).toEqual({ amountMinor: 50000, markedAt: 50 })
  })
  it('totals before and after the transfers collect the same cash', () => {
    const before = paymentTotals({
      marks: [{ amountMinor: 50000 }, { amountMinor: 90000 }],
      total: 2,
      amountDue: due,
      cost: null,
    })
    // After: C (carried) and D on the roster; A and B are released.
    const live = ['C', 'D'].map((id) => payment(id).mark).filter((m) => m !== null)
    const after = paymentTotals({ marks: live, total: 2, amountDue: due, cost: null })
    expect(after.collected).toBe(before.collected)
    expect(after).toMatchObject({ paid: 2, partial: 0, waived: 40000, stillDue: 0 })
    expect(before).toMatchObject({ paid: 1, partial: 1, stillDue: 40000 })
  })
  it('a later own payment by the recipient adds cash once', () => {
    const own = { amountMinor: 10000, markedAt: 250 }
    expect(
      entrySlotPayment({ entryId: 'C', ownMark: own, transfers, amountDue: due }).mark,
    ).toEqual({ amountMinor: 60000, waivedMinor: 40000 })
  })
  it("the next approval's holding is the slot's cash and waivers", () => {
    expect(holdingOf(payment('C'), due)).toEqual({ cashMinor: 50000, waivedMinor: 40000 })
    expect(holdingOf(payment('Z'), due)).toBeNull()
  })
  it('a legacy mark with no amount counts at the amount due', () => {
    expect(
      holdingOf(
        entrySlotPayment({
          entryId: 'E',
          ownMark: { amountMinor: null, markedAt: 1 },
          transfers: [],
          amountDue: due,
        }),
        due,
      ),
    ).toEqual({ cashMinor: 90000, waivedMinor: 0 })
  })
  it('a row approved before #1013 carries nothing', () => {
    const legacy = { ...t1, payment: null }
    expect(
      entrySlotPayment({ entryId: 'B', ownMark: null, transfers: [legacy], amountDue: due }).mark,
    ).toEqual({ amountMinor: 0, waivedMinor: 0 })
  })
})
