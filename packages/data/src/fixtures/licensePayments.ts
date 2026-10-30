import type { ClubLicenseTerm } from '../license/license.types'
import { adminAccount } from './adminAccounts'
import { DEMO_CLUB_ID } from './clubs'

/**
 * Recording evidence for a seeded term: the platform owner recorded it at 9 AM Manila on the day the
 * club paid, under a seed command ID (rotra-admin.html `term()` records `by: OWNER`).
 */
export function seededActivation(
  paidOn: string,
  ref: string,
): Pick<ClubLicenseTerm, 'activatedAt' | 'activatedByEmail' | 'sourceCommandId'> {
  return {
    activatedAt: `${paidOn}T09:00:00+08:00`,
    activatedByEmail: adminAccount.email,
    sourceCommandId: `seed-${ref}`,
  }
}

export const licensePayments: ClubLicenseTerm[] = [
  {
    id: 'LIC-0004',
    clubId: DEMO_CLUB_ID,
    plan: 'Yearly',
    startsAt: '2026-04-01',
    endsAt: '2027-03-31',
    amountMinor: 1500000,
    currency: 'PHP',
    paidOn: '2026-04-01',
    paymentReference: 'LIC-0004',
    ...seededActivation('2026-04-01', 'LIC-0004'),
  },
  {
    id: 'LIC-0003',
    clubId: DEMO_CLUB_ID,
    plan: 'Monthly',
    startsAt: '2026-03-01',
    endsAt: '2026-03-31',
    amountMinor: 150000,
    currency: 'PHP',
    paidOn: '2026-03-02',
    paymentReference: 'LIC-0003',
    ...seededActivation('2026-03-02', 'LIC-0003'),
  },
  {
    id: 'LIC-0002',
    clubId: DEMO_CLUB_ID,
    plan: 'Monthly',
    startsAt: '2026-02-01',
    endsAt: '2026-02-28',
    amountMinor: 150000,
    currency: 'PHP',
    paidOn: '2026-02-01',
    paymentReference: 'LIC-0002',
    ...seededActivation('2026-02-01', 'LIC-0002'),
  },
  {
    id: 'LIC-0001',
    clubId: DEMO_CLUB_ID,
    plan: 'Monthly',
    startsAt: '2026-01-05',
    endsAt: '2026-01-31',
    amountMinor: 150000,
    currency: 'PHP',
    paidOn: '2026-01-05',
    paymentReference: 'LIC-0001',
    ...seededActivation('2026-01-05', 'LIC-0001'),
  },
]
