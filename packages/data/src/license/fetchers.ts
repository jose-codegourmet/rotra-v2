import { isAdminOffline } from '../admin-account/connectivity'
import { adminMutation } from '../admin-account/mutation'
import { appendAdminAudit } from '../admin-audit/fetchers'
import { adminAccount } from '../fixtures/adminAccounts'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { consumeMockDevToggle, getMockDevState, requireOnline } from '../mock/bridge'
import { isProductionBuild } from '../mock/env'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import {
  accessOf,
  formatLicenseDate,
  isCalendarDate,
  licenseAuditSummary,
  manilaToday,
  termEnd,
} from './license.rules'
import type {
  ActivateLicenseInput,
  ClubAccess,
  ClubLicenseTerm,
  ClubRetentionRecord,
  LicenseOperation,
} from './license.types'
export async function getClubAccess(): Promise<ClubAccess> {
  const state = readMockState()
  return {
    status: getMockDevState().licenseExpired ? ('expired' as const) : ('active' as const),
    activeSessionId:
      state.sessions.find((s) => s.clubId === DEMO_CLUB_ID && s.state === 'active')?.id ?? null,
  }
}
export async function getLicensePayments() {
  await delay()
  requireOnline()
  return readMockState()
    .licensePayments.filter((row) => row.clubId === DEMO_CLUB_ID)
    .sort((a, b) => (b.paidOn ?? '').localeCompare(a.paidOn ?? ''))
}
export async function getClubLicense() {
  const payments = await getLicensePayments(),
    term = payments[0]
  if (!term) return null
  const until = new Date(`${term.endsAt}T23:59:59`).getTime()
  return {
    plan: term.plan,
    activeSince: term.startsAt,
    activeUntil: term.endsAt,
    daysLeft: Math.max(0, Math.ceil((until - Date.now()) / 86400000)),
    status: (await getClubAccess()).status,
  }
}
/** Exact prototype columns, quoted cells, integer-minor conversion only; no pricing calculation. */
export function licensePaymentsCsv(rows: ClubLicenseTerm[]): string {
  const cells = [
    ['Paid', 'Plan', 'Covers from', 'Covers to', 'Amount (PHP)', 'Reference'],
    ...rows.map((row) => [
      row.paidOn ?? '',
      row.plan,
      row.startsAt,
      row.endsAt,
      String(row.amountMinor / 100),
      row.paymentReference,
    ]),
  ]
  return cells.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
}

// ---------- Admin: license terms, activation and renewal (A-LICENSE, D-LICENSE) ----------

const LICENSE_REFERENCE_MAX = 40
/** The reply to an Activate/Renew license was lost; the term may have been saved. */
export const LICENSE_NO_REPLY_ERROR =
  "We didn't hear back, so we can't tell yet whether the license was saved."
export const LICENSE_CHECK_OFFLINE_ERROR = "You're offline. Check the status once you're connected."

const newestFirst = (a: ClubLicenseTerm, b: ClubLicenseTerm) =>
  b.startsAt.localeCompare(a.startsAt) || Date.parse(b.activatedAt) - Date.parse(a.activatedAt)

function retentionRecordIn(state: MockState, clubId: string): ClubRetentionRecord {
  let record = state.clubRetentionRecords.find((entry) => entry.clubId === clubId)
  if (!record) {
    record = { clubId, cycles: [], failedOn: null, deletedOn: null }
    state.clubRetentionRecords.push(record)
  }
  return record
}

/** Renewed when the club had a term recorded before this one, else Activated. */
function operationOf(state: MockState, term: ClubLicenseTerm): LicenseOperation {
  const at = Date.parse(term.activatedAt)
  const earlier = state.licensePayments.some(
    (other) =>
      other.clubId === term.clubId && other.id !== term.id && Date.parse(other.activatedAt) < at,
  )
  return { term: structuredClone(term), verb: earlier ? 'Renewed' : 'Activated' }
}

/** Swap this implementation for the real transport when the database epic lands. */
export async function listLicenseTerms(
  clubId: string,
  signal?: AbortSignal,
): Promise<ClubLicenseTerm[]> {
  await delay(400, signal)
  return readMockState()
    .licensePayments.filter((term) => term.clubId === clubId)
    .sort(newestFirst)
}

/** Same rules as the License form; the server rechecks what the form already checked. */
function licenseErrors(input: ActivateLicenseInput, free: boolean, today: string) {
  const errors: Record<string, string> = {}
  if (input.plan !== 'Monthly' && input.plan !== 'Yearly') errors.plan = 'Choose monthly or yearly.'
  if (!isCalendarDate(input.startsOn)) errors.startsOn = 'Enter the date the term starts.'
  if (input.reference.trim().length > LICENSE_REFERENCE_MAX)
    errors.reference = 'Keep the reference under 40 characters.'
  if (free) return errors
  if (!input.paidOn || !isCalendarDate(input.paidOn))
    errors.paidOn = 'Enter the date the club paid.'
  else if (input.paidOn > today) errors.paidOn = "The payment date can't be in the future."
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0 || input.amountMinor % 100)
    errors.amount = 'Enter the amount the club paid, in pesos.'
  return errors
}

/**
 * Records one license term, idempotent on sourceCommandId: a repeat returns the term it already
 * added and never adds a second period. A free club's term is recorded at 0 with no payment date.
 * When an expired club's new term covers today, the current countdown is cancelled and the public
 * pages restored, unless they were already deleted. A later expiry starts a new countdown.
 */
export async function activateLicense(input: ActivateLicenseInput): Promise<LicenseOperation> {
  const operation = await adminMutation(1200, (draft) => {
    const replay = draft.licensePayments.find(
      (term) => term.sourceCommandId === input.sourceCommandId,
    )
    if (replay) return operationOf(draft, replay)
    const club = draft.clubs.find((entry) => entry.id === input.clubId)
    if (!club) throw new MockError('permission', 'This club is not available.')
    const today = manilaToday()
    const free = club.licensePricing === 'free'
    const errors = licenseErrors(input, free, today)
    const first = Object.values(errors)[0]
    if (first) throw new MockError('permission', first, errors)
    const before = draft.licensePayments.filter((term) => term.clubId === club.id)
    const access = accessOf(before, today)
    const term: ClubLicenseTerm = {
      id: crypto.randomUUID(),
      clubId: club.id,
      plan: input.plan,
      startsAt: input.startsOn,
      endsAt: termEnd(input.startsOn, input.plan),
      amountMinor: free ? 0 : input.amountMinor,
      currency: 'PHP',
      paidOn: free ? null : input.paidOn,
      paymentReference: input.reference.trim(),
      activatedAt: new Date().toISOString(),
      activatedByEmail: adminAccount.email,
      sourceCommandId: input.sourceCommandId,
    }
    draft.licensePayments.push(term)
    let retentionNote = ''
    if (access.state === 'expired' && term.startsAt <= today && term.endsAt >= today) {
      const record = retentionRecordIn(draft, club.id)
      if (record.deletedOn)
        retentionNote = ' Public pages were already deleted and were not restored.'
      else {
        const from = formatLicenseDate(access.since)
        record.cycles.push({ expired: access.since, cancelled: today })
        record.failedOn = null
        retentionNote = ` Public pages restored; deletion countdown from ${from} cancelled.`
      }
    }
    const verb = before.length ? 'Renewed' : 'Activated'
    appendAdminAudit(draft, {
      action: verb === 'Renewed' ? 'license_renewed' : 'license_activated',
      targetType: 'club',
      targetId: club.id,
      summary: licenseAuditSummary(verb, term, retentionNote),
    })
    return { term: structuredClone(term), verb } satisfies LicenseOperation
  })
  // Dev toggle: the term is saved above, but the reply never arrives.
  if (!isProductionBuild() && consumeMockDevToggle('adminNextLicenseSaveNoReply'))
    throw new MockError('timeout', LICENSE_NO_REPLY_ERROR)
  return operation
}

/**
 * D-LICENSE › Check status after a lost reply: the term that command recorded, or null when it was
 * not saved (the screen then offers to save again with the same sourceCommandId).
 */
export async function getLicenseOperation(
  sourceCommandId: string,
  signal?: AbortSignal,
): Promise<LicenseOperation | null> {
  if (isAdminOffline()) throw new MockError('offline', LICENSE_CHECK_OFFLINE_ERROR)
  await delay(900, signal)
  if (isAdminOffline()) throw new MockError('offline', LICENSE_CHECK_OFFLINE_ERROR)
  const state = readMockState()
  const term = state.licensePayments.find((entry) => entry.sourceCommandId === sourceCommandId)
  return term ? operationOf(state, term) : null
}
