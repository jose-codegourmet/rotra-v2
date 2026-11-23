import { describe, expect, it } from 'vitest'
import {
  entrySlotPayment,
  holdingOf,
  type LedgerTransfer,
  transferSnapshot,
} from '../slot-transfer/transferAccounting.rules'
import {
  firstEligibleWaiter,
  fullRefundAmount,
  type LedgerRefund,
  netKeptCash,
  refundedFor,
  refundList,
  rejectRefundText,
  transferRefundToast,
} from './paymentRefund.rules'
import { paymentShareEntry } from './paymentShare.rules'
import { paymentStatus, paymentTotals, receivedAmount } from './sessionPayment.rules'

const due = 90000

describe('net kept cash (#1014)', () => {
  it('takes a refund off the cash received, never below 0', () => {
    expect(netKeptCash(50000, 0)).toBe(50000)
    expect(netKeptCash(50000, 50000)).toBe(0)
    expect(netKeptCash(50000, 60000)).toBe(0)
    expect(netKeptCash(-10, 0)).toBe(0)
  })
  it('sums the refunds of one entry only', () => {
    const refunds: LedgerRefund[] = [
      { pid: 'A', amountMinor: 50000, refundedAt: 1 },
      { pid: 'B', amountMinor: 90000, refundedAt: 2 },
    ]
    expect(refundedFor(refunds, 'A')).toBe(50000)
    expect(refundedFor(refunds, 'C')).toBe(0)
    expect(refundedFor(undefined, 'A')).toBe(0)
  })
  it('a full refund is all the cash still held; nothing paid means nothing to refund', () => {
    expect(fullRefundAmount(50000)).toBe(50000)
    expect(fullRefundAmount(0)).toBe(0)
  })
})

describe('refunds in the slot ledger (#1013 + #1014)', () => {
  const approved = (over: Partial<LedgerTransfer>): LedgerTransfer => ({
    id: 't1',
    pid: 'A',
    recipientPid: 'B',
    status: 'approved',
    decidedAt: 100,
    payment: { amountDueMinor: due, paidMinor: 50000, priorWaivedMinor: 0, waivedMinor: 40000 },
    ...over,
  })

  it('an own payment that was refunded counts nothing as kept, and shows the refund', () => {
    const payment = entrySlotPayment({
      entryId: 'A',
      ownMark: { amountMinor: 50000, markedAt: 10 },
      transfers: [],
      amountDue: due,
      refunds: [{ pid: 'A', amountMinor: 50000, refundedAt: 20 }],
    })
    expect(payment.mark).toEqual({ amountMinor: 0, waivedMinor: 0 })
    expect(payment.refundedMinor).toBe(50000)
    expect(paymentStatus(payment.mark, due)).toEqual({ kind: 'unpaid' })
  })
  it('a legacy mark with no amount refunds at today’s amount due', () => {
    const payment = entrySlotPayment({
      entryId: 'A',
      ownMark: { amountMinor: null, markedAt: 10 },
      transfers: [],
      amountDue: due,
      refunds: [{ pid: 'A', amountMinor: due, refundedAt: 20 }],
    })
    expect(payment.mark?.amountMinor).toBe(0)
  })
  it('without a refund nothing changes (a legacy mark keeps null)', () => {
    const payment = entrySlotPayment({
      entryId: 'A',
      ownMark: { amountMinor: null, markedAt: 10 },
      transfers: [],
      amountDue: due,
      refunds: [{ pid: 'Z', amountMinor: due, refundedAt: 20 }],
    })
    expect(payment.mark).toEqual({ amountMinor: null, waivedMinor: 0 })
    expect(payment.refundedMinor).toBe(0)
  })
  it('the refund of a carried slot is the whole slot cash, never its waiver', () => {
    // A paid ₱500 of ₱900 and gave the slot to B (₱400 waived). B then asks to transfer to C and
    // the Queue Master rejects and refunds: B is handed back the slot's ₱500 cash, not ₱900.
    const before = entrySlotPayment({
      entryId: 'B',
      ownMark: null,
      transfers: [approved({})],
      amountDue: due,
    })
    const holding = holdingOf(before, due)
    expect(holding).toEqual({ cashMinor: 50000, waivedMinor: 40000 })
    expect(fullRefundAmount(holding?.cashMinor ?? 0)).toBe(50000)
    // The Requests row's payment preview carries the same cash as the refund amount.
    expect(transferSnapshot(due, holding).paidMinor).toBe(50000)
    const after = entrySlotPayment({
      entryId: 'B',
      ownMark: null,
      transfers: [approved({})],
      amountDue: due,
      refunds: [{ pid: 'B', amountMinor: 50000, refundedAt: 200 }],
    })
    expect(after.mark).toEqual({ amountMinor: 0, waivedMinor: 40000 })
    expect(after.refundedMinor).toBe(50000)
  })
  it('totals: collected is net kept, refunded is shown apart, against costs uses net kept', () => {
    const totals = paymentTotals({
      marks: [
        { amountMinor: 0, refundedMinor: 50000 },
        { amountMinor: 90000 },
        { amountMinor: 0, waivedMinor: 90000 },
      ],
      total: 3,
      amountDue: due,
      cost: 100000,
    })
    expect(totals.collected).toBe(90000)
    expect(totals.refunded).toBe(50000)
    expect(totals.waived).toBe(90000)
    expect(totals.againstCosts).toBe(-10000)
    // The refunded player owes the amount due again; nothing is to reimburse.
    expect(totals.stillDue).toBe(90000)
    expect(totals.toReimburse).toBe(0)
  })
  it('the payment status share counts only kept cash as collected', () => {
    const payment = entrySlotPayment({
      entryId: 'A',
      ownMark: { amountMinor: 50000, markedAt: 10 },
      transfers: [],
      amountDue: due,
      refunds: [{ pid: 'A', amountMinor: 50000, refundedAt: 20 }],
    })
    const entry = paymentShareEntry(
      { name: 'Ana', receivedMinor: receivedAmount(payment.mark, due) },
      due,
    )
    expect(entry.receivedMinor).toBe(0)
    expect(entry.group).toBe('unpaid')
  })
})

describe('Refund everyone who paid (cancelled session, #1014)', () => {
  const rows = [
    { entryId: 'a', name: 'Ana', receivedMinor: 90000, waivedMinor: 0, refund: null },
    { entryId: 'b', name: 'Ben', receivedMinor: 50000, waivedMinor: 0, refund: null },
    { entryId: 'c', name: 'Cara', receivedMinor: 0, waivedMinor: 0, refund: null },
    // Paid ₱500 of ₱900 and gave the slot on: Dani holds ₱500 cash and a ₱400 waiver.
    { entryId: 'd', name: 'Dani', receivedMinor: 50000, waivedMinor: 40000, refund: null },
    // A slot that only holds a waiver: nothing to refund.
    { entryId: 'e', name: 'Eli', receivedMinor: 0, waivedMinor: 90000, refund: null },
    { entryId: 'f', name: 'Fe', receivedMinor: 100000, waivedMinor: 0, refund: null },
    {
      entryId: 'g',
      name: 'Gio',
      receivedMinor: 90000,
      waivedMinor: 0,
      refund: { amountMinor: 90000, refundedAt: 5 },
    },
  ]
  it('lists paid and partially paid players with their whole cash, never a waiver', () => {
    const list = refundList(rows, due)
    expect(list.rows.map((r) => [r.name, r.status, r.amountMinor, r.recorded])).toEqual([
      ['Ana', 'paid', 90000, false],
      ['Ben', 'partial', 50000, false],
      ['Dani', 'paid', 50000, false],
      ['Fe', 'paid', 100000, false],
      ['Gio', 'paid', 90000, true],
    ])
    expect(list.leftMinor).toBe(290000)
    expect(list.leftCount).toBe(4)
    expect(list.refundedMinor).toBe(90000)
  })
  it('with no fee set, anyone who paid cash is listed as paid', () => {
    const list = refundList([rows[1] as (typeof rows)[number]], null)
    expect(list.rows[0]?.status).toBe('paid')
    expect(list.rows[0]?.amountMinor).toBe(50000)
  })
  it('an empty roster has nothing to refund', () => {
    expect(refundList([], due)).toEqual({ rows: [], leftMinor: 0, refundedMinor: 0, leftCount: 0 })
  })
})

describe('FIFO promotion after a refund frees the slot (#1014)', () => {
  const waitlist = [
    { id: 'w1', level: null },
    { id: 'w2', level: 12 },
    { id: 'w3', level: 15 },
  ]
  const hasLevel = (w: { level: number | null }) => w.level !== null
  it('promotes the first waitlisted person with a level', () => {
    expect(firstEligibleWaiter(waitlist, 1, hasLevel)?.id).toBe('w2')
  })
  it('promotes nobody when no slot opened (an over-full roster) or nobody is eligible', () => {
    expect(firstEligibleWaiter(waitlist, 0, hasLevel)).toBeNull()
    expect(firstEligibleWaiter([{ id: 'w1', level: null }], 1, hasLevel)).toBeNull()
    expect(firstEligibleWaiter([], 2, hasLevel)).toBeNull()
  })
})

describe('refund wording', () => {
  it('states the amount to hand back and that ROTRA moves no money', () => {
    expect(rejectRefundText('Dani', 50000)).toBe(
      'Hand ₱500 back to Dani outside ROTRA. ROTRA only records the refund; it moves no money.',
    )
    expect(transferRefundToast('Dani', 50000, 'Rhea')).toBe(
      'Transfer rejected · ₱500 refund recorded for Dani · Rhea got the slot from the waitlist',
    )
    expect(transferRefundToast('Dani', 50000, null)).toBe(
      'Transfer rejected · ₱500 refund recorded for Dani · the slot is open',
    )
  })
})
