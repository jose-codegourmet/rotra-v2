/**
 * Payment status share (#1010, epic #1009; owner decisions 2026-11-22, #1015). Pure; integer
 * centavos. Builds the numbered Paid / Partial / Unpaid text a Queue Master (or the public session
 * page) copies or shares. Reuses `paymentStatus` for the amount due and status; adds only grouping,
 * numbering and wording. ROTRA moves no money: the text is information.
 *
 * - Only confirmed roster people are passed in (registered players and guests); waitlisted people
 *   never reach this rule.
 * - Collected is actual received cash only. A waived amount (`waivedMinor`, from the slot transfer
 *   tickets, #1013) lowers what is owed but is never collected.
 */
import { formatPeso } from '@rotra/schema/money'
import { paymentStatus } from './sessionPayment.rules'

export type PaymentShareFilter = 'all' | 'paid' | 'partial' | 'unpaid'
export type PaymentShareGroup = Exclude<PaymentShareFilter, 'all'>

export type PaymentShareRow = {
  /** The name to print (the public page passes the masked one) */
  name: string
  /** Amount received in centavos; null or 0 means no payment */
  receivedMinor: number | null
  /** Amount waived in centavos (a waiver is not cash); omitted means none */
  waivedMinor?: number
}

export type PaymentShareEntry = {
  name: string
  group: PaymentShareGroup
  /** Cash received */
  receivedMinor: number
  /** Still owed after received cash and any waiver; null when no fee is set */
  balanceMinor: number | null
  /** Received above the amount due, to return outside ROTRA */
  overMinor: number
  waivedMinor: number
}

export type PaymentShareTotals = {
  count: number
  /** Σ received cash of the shown people; never includes waived amounts */
  collectedMinor: number
  /** Σ balances of the shown people; null when no fee is set */
  balanceMinor: number | null
}

export const PAYMENT_SHARE_LABELS: Record<PaymentShareGroup, string> = {
  paid: 'Paid',
  partial: 'Partial',
  unpaid: 'Unpaid',
}
const GROUPS: PaymentShareGroup[] = ['paid', 'partial', 'unpaid']

/** One person's group, balance and cash. A waiver counts toward "paid in full", never as cash. */
export function paymentShareEntry(
  row: PaymentShareRow,
  amountDue: number | null,
): PaymentShareEntry {
  const received = Math.max(row.receivedMinor ?? 0, 0)
  const waived = Math.max(row.waivedMinor ?? 0, 0)
  const base = { name: row.name, receivedMinor: received, waivedMinor: waived }
  if (amountDue === null) {
    // No fee set: any payment counts as paid, no balance to show.
    return { ...base, group: received > 0 ? 'paid' : 'unpaid', balanceMinor: null, overMinor: 0 }
  }
  const due = Math.max(amountDue - waived, 0)
  if (waived > 0 && received + waived >= amountDue) {
    return { ...base, group: 'paid', balanceMinor: 0, overMinor: Math.max(received - due, 0) }
  }
  const status = paymentStatus(received > 0 ? { amountMinor: received } : null, due)
  if (status.kind === 'partial')
    return { ...base, group: 'partial', balanceMinor: status.left, overMinor: 0 }
  if (status.kind === 'unpaid') return { ...base, group: 'unpaid', balanceMinor: due, overMinor: 0 }
  return {
    ...base,
    group: 'paid',
    balanceMinor: 0,
    overMinor: status.kind === 'reimburse' ? status.toReturn : 0,
  }
}

/** The people in each group, in the order given (callers pass them sorted by name). */
export function groupPaymentShare(rows: PaymentShareRow[], amountDue: number | null) {
  const groups: Record<PaymentShareGroup, PaymentShareEntry[]> = {
    paid: [],
    partial: [],
    unpaid: [],
  }
  for (const row of rows) {
    const entry = paymentShareEntry(row, amountDue)
    groups[entry.group].push(entry)
  }
  return groups
}

export function paymentShareTotals(
  entries: PaymentShareEntry[],
  amountDue: number | null,
): PaymentShareTotals {
  return {
    count: entries.length,
    collectedMinor: entries.reduce((sum, e) => sum + e.receivedMinor, 0),
    balanceMinor:
      amountDue === null ? null : entries.reduce((sum, e) => sum + (e.balanceMinor ?? 0), 0),
  }
}

function lineOf(index: number, entry: PaymentShareEntry, group: PaymentShareGroup) {
  const parts = [`${index + 1}. ${entry.name}`]
  if (group === 'unpaid') {
    if (entry.balanceMinor !== null) parts.push(`balance ${formatPeso(entry.balanceMinor)}`)
  } else {
    parts.push(`paid ${formatPeso(entry.receivedMinor)}`)
    if (entry.balanceMinor !== null) parts.push(`balance ${formatPeso(entry.balanceMinor)}`)
    if (entry.overMinor) parts.push(`${formatPeso(entry.overMinor)} to return`)
  }
  if (entry.waivedMinor) parts.push(`${formatPeso(entry.waivedMinor)} waived`)
  return parts.join(' · ')
}

export type PaymentShareInput = {
  /** “Thursday Open Play · Thu, Nov 20” */
  heading: string
  amountDue: number | null
  rows: PaymentShareRow[]
  filter: PaymentShareFilter
}

/**
 * The share text and its parts. Each shown status has a header with its count, then a numbered
 * list (an empty status reads "None"). The last line totals the shown people: collected cash and
 * the balance still owed.
 */
export function buildPaymentShare({ heading, amountDue, rows, filter }: PaymentShareInput) {
  const groups = groupPaymentShare(rows, amountDue)
  const shown = filter === 'all' ? GROUPS : [filter]
  const entries = shown.flatMap((group) => groups[group])
  const totals = paymentShareTotals(entries, amountDue)
  const lines = [`Payment status · ${heading}`]
  lines.push(
    amountDue === null ? 'No fee set for this session.' : `${formatPeso(amountDue)} per player`,
  )
  for (const group of shown) {
    lines.push('', `${PAYMENT_SHARE_LABELS[group].toUpperCase()} (${groups[group].length})`)
    if (!groups[group].length) lines.push('None')
    else lines.push(...groups[group].map((entry, i) => lineOf(i, entry, group)))
  }
  lines.push(
    '',
    totals.balanceMinor === null
      ? `Collected: ${formatPeso(totals.collectedMinor)}`
      : `Collected: ${formatPeso(totals.collectedMinor)} · Balance: ${formatPeso(totals.balanceMinor)}`,
  )
  return {
    text: lines.join('\n'),
    groups,
    totals,
    counts: {
      all: rows.length,
      paid: groups.paid.length,
      partial: groups.partial.length,
      unpaid: groups.unpaid.length,
    } satisfies Record<PaymentShareFilter, number>,
  }
}
