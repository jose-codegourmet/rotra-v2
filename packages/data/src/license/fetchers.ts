import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { getMockDevState, requireOnline } from '../mock/bridge'
import { delay } from '../mock/latency'
import { readMockState } from '../mock/store'
import type { ClubAccess, ClubLicenseTerm } from './license.types'
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
