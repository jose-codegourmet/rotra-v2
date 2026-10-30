import { type ClubPrice, formatAmount } from '../club/club.rules'
import type {
  ClubAccessState,
  ClubExpiryCycle,
  ClubLicenseTerm,
  ClubRetentionRecord,
  LicenseDraft,
  LicensePlan,
  RetentionState,
} from './license.types'

/** Public pages are deleted after six months of continuous expiry (business rules › retention). */
export const RETENTION_MONTHS = 6

// ---------- Calendar dates ('YYYY-MM-DD', no time zone: UTC arithmetic only) ----------

const MANILA_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const SHORT_DATE = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
const SHORT_DAY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
})

/** Today's calendar date in Manila, the day license access and retention are measured on. */
export function manilaToday(now: Date = new Date()): string {
  return MANILA_DAY.format(now)
}

function partsOf(ymd: string): [number, number, number] {
  const [y = 0, m = 1, d = 1] = ymd.split('-').map(Number)
  return [y, m, d]
}
const ymdOf = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const utcOf = (ymd: string) => {
  const [y, m, d] = partsOf(ymd)
  return Date.UTC(y, m - 1, d)
}

/** A real calendar date in YYYY-MM-DD form (rotra-admin.html validYmd). */
export function isCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && ymdOf(utcOf(value)) === value
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = partsOf(ymd)
  return ymdOf(Date.UTC(y, m - 1, d + days))
}

/** Same day n months on, clamped to the end of a shorter month (Jan 31 + 1 → Feb 28). */
export function addMonths(ymd: string, months: number): string {
  const [y, m, d] = partsOf(ymd)
  const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate()
  return ymdOf(Date.UTC(y, m - 1 + months, Math.min(d, lastDay)))
}

/** Whole days from a to b (negative when b is earlier). */
export function diffDays(a: string, b: string): number {
  return Math.round((utcOf(b) - utcOf(a)) / 864e5)
}

/** 'Oct 3, 2026' (rotra-admin.html fmtYmd, en-US). */
export function formatLicenseDate(ymd: string): string {
  return SHORT_DATE.format(utcOf(ymd))
}

/** 'Oct 3 – Nov 2, 2026', or both years when they differ: the record's term ranges. */
export function formatTermRange(from: string, to: string): string {
  return from.slice(0, 4) === to.slice(0, 4)
    ? `${SHORT_DAY.format(utcOf(from))} – ${formatLicenseDate(to)}`
    : `${formatLicenseDate(from)} – ${formatLicenseDate(to)}`
}

// ---------- Terms and access ----------

/** The last day a term covers: one month or twelve on, less a day (rotra-admin.html termEnd()). */
export function termEnd(startsOn: string, plan: LicensePlan): string {
  return addDays(addMonths(startsOn, plan === 'Yearly' ? 12 : 1), -1)
}

/** The club's price for a plan in centavos; a free club's terms are recorded at 0. */
export function planPriceMinor(club: ClubPrice, plan: LicensePlan): number {
  if (club.licensePricing === 'free') return 0
  return plan === 'Yearly' ? club.licenseYearlyMinor : club.licenseMonthlyMinor
}

/**
 * One club's access on `today` from its terms (rotra-admin.html access()). Back-to-back terms (one
 * starting by the day after another ends) read as one continuous period. Pass one club's terms only.
 */
export function accessOf(terms: readonly ClubLicenseTerm[], today: string): ClubAccessState {
  if (!terms.length) return { state: 'none' }
  const current = terms
    .filter((term) => term.startsAt <= today && today <= term.endsAt)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  if (current) {
    let until = current.endsAt
    let moved = true
    while (moved) {
      moved = false
      for (const term of terms) {
        if (term.startsAt <= addDays(until, 1) && term.endsAt > until) {
          until = term.endsAt
          moved = true
        }
      }
    }
    return { state: 'active', plan: current.plan, until, days: diffDays(today, until) }
  }
  const next = terms
    .filter((term) => term.startsAt > today)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  const last = terms
    .filter((term) => term.endsAt < today)
    .sort((a, b) => b.endsAt.localeCompare(a.endsAt))[0]
  if (!last)
    return next ? { state: 'scheduled', plan: next.plan, starts: next.startsAt } : { state: 'none' }
  return {
    state: 'expired',
    plan: last.plan,
    ended: last.endsAt,
    since: addDays(last.endsAt, 1),
    next: next?.startsAt ?? null,
  }
}

const isCancelled = (cycle: ClubExpiryCycle): cycle is ClubExpiryCycle & { cancelled: string } =>
  cycle.cancelled !== null

/**
 * The club's public pages on `today` (rotra-admin.html retention()). The countdown runs six months
 * from the first unlicensed day of the current continuous expiry, never from session dates; it is
 * 'due' once that day is reached and only 'deleted' once deletion actually finished. A failed
 * deletion belongs to the current expiry only, so a later expiry starts clean.
 */
export function retentionOf(
  terms: readonly ClubLicenseTerm[],
  record: Pick<ClubRetentionRecord, 'cycles' | 'failedOn' | 'deletedOn'> | undefined,
  today: string,
): RetentionState {
  if (record?.deletedOn) return { k: 'deleted', on: record.deletedOn }
  const access = accessOf(terms, today)
  if (access.state !== 'expired') {
    const last = (record?.cycles ?? []).filter(isCancelled).at(-1)
    return last
      ? { k: 'restored', cycle: { expired: last.expired, cancelled: last.cancelled } }
      : { k: 'none' }
  }
  const since = access.since
  const deleteOn = addMonths(since, RETENTION_MONTHS)
  if (record?.failedOn && record.failedOn >= since)
    return { k: 'failed', deleteOn, failedOn: record.failedOn, since }
  if (today >= deleteOn) return { k: 'due', deleteOn, since }
  const total = diffDays(since, deleteOn)
  return {
    k: 'stale',
    deleteOn,
    since,
    left: diffDays(today, deleteOn),
    elapsed: Math.min(total, Math.max(0, diffDays(since, today))),
    total,
  }
}

// ---------- A-LICENSE / D-LICENSE ----------

/**
 * Prefilled values for Activate/Renew license (rotra-admin.html licStart()): the latest plan, the
 * club's price for it (0 when free), paid today. Renewal start rule is the prototype placeholder (open
 * decision: early renewal and overlapping terms): the day after access ends when active, else today.
 */
export function defaultLicenseDraft(
  club: ClubPrice,
  terms: readonly ClubLicenseTerm[],
  today: string,
): LicenseDraft {
  const access = accessOf(terms, today)
  const latest = [...terms].sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0]
  const plan = latest?.plan ?? null
  return {
    plan,
    startsOn: access.state === 'active' ? addDays(access.until, 1) : today,
    paidOn: today,
    amountMinor: club.licensePricing === 'free' ? 0 : plan ? planPriceMinor(club, plan) : null,
    reference: '',
  }
}

/** Days the new term starts inside the current active period (D-LICENSE overlap note); 0 if none. */
export function overlapDays(access: ClubAccessState, draft: { startsOn: string }): number {
  return access.state === 'active' && draft.startsOn <= access.until
    ? diffDays(draft.startsOn, access.until) + 1
    : 0
}

/** What saving this term will do, as D-LICENSE lists it (rotra-admin.html licEffects()). */
export function licenseEffects(
  club: { name: string },
  access: ClubAccessState,
  retention: RetentionState,
  draft: { plan: LicensePlan; startsOn: string },
  today: string,
): string[] {
  const to = termEnd(draft.startsOn, draft.plan)
  const lines = [
    `${club.name} can use the Queue app from ${formatLicenseDate(draft.startsOn)} to ${formatLicenseDate(to)}.`,
  ]
  if (access.state === 'expired') {
    if (draft.startsOn > today)
      lines.push(
        `Until ${formatLicenseDate(draft.startsOn)} the club stays expired and its public pages stay stale.`,
      )
    else if (retention.k === 'deleted')
      lines.push(
        `The public pages deleted on ${formatLicenseDate(retention.on)} don't come back. Player match history and ranks were kept.`,
      )
    else if (retention.k === 'failed')
      lines.push("Restores the club's stale public pages and cancels the pending deletion retry.")
    else if (retention.k === 'stale' || retention.k === 'due')
      lines.push(
        `Restores the club's stale public pages and cancels the deletion scheduled for ${formatLicenseDate(retention.deleteOn)}.`,
      )
  }
  lines.push('Still one active session at a time.')
  lines.push('Adds a payment record the club sees in Club settings.')
  return lines
}

/**
 * The record line for a recorded term (rotra-admin.html licCommit()):
 * 'Renewed license: Monthly, Oct 3 – Nov 2, 2026 · ₱1,500 · LIC-0009.' plus any retention sentence.
 */
export function licenseAuditSummary(
  verb: 'Activated' | 'Renewed',
  term: Pick<ClubLicenseTerm, 'plan' | 'startsAt' | 'endsAt' | 'amountMinor' | 'paymentReference'>,
  retentionNote = '',
): string {
  const ref = term.paymentReference ? ` · ${term.paymentReference}` : ''
  return `${verb} license: ${term.plan}, ${formatTermRange(term.startsAt, term.endsAt)} · ${formatAmount(term.amountMinor)}${ref}.${retentionNote}`
}
