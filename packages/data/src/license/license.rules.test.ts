import { describe, expect, it } from 'vitest'
import type { ClubPrice } from '../club/club.rules'
import {
  ADMIN_LICENSE_TODAY,
  adminClubLicenseStates,
  adminClubRetentionRecords,
  adminClubTerms,
} from '../fixtures/adminClubs'
import { clubs } from '../fixtures/clubs'
import type { ClubLicenseTerm, ClubRetentionRecord } from './license.types'

const _TODAY = ADMIN_LICENSE_TODAY

function _term(plan: ClubLicenseTerm['plan'], startsAt: string, endsAt: string): ClubLicenseTerm {
  return {
    id: `${startsAt}-${plan}`,
    clubId: 'club',
    plan,
    startsAt,
    endsAt,
    amountMinor: 150000,
    currency: 'PHP',
    paidOn: startsAt,
    paymentReference: '',
    activatedAt: `${startsAt}T09:00:00+08:00`,
    activatedByEmail: 'owner@rotra.example',
    sourceCommandId: `cmd-${startsAt}`,
  }
}

const _noRecord = { cycles: [], failedOn: null, deletedOn: null }
const paid: ClubPrice = {
  licensePricing: 'paid',
  licenseMonthlyMinor: 150000,
  licenseYearlyMinor: 1500000,
}
const _free: ClubPrice = { ...paid, licensePricing: 'free' }

function _fixtureClub(username: string) {
  const club = clubs.find((row) => row.username === username)
  if (!club) throw new Error(`Club fixture missing: ${username}`)
  return {
    club,
    terms: adminClubTerms.filter((row) => row.clubId === club.id),
    record: adminClubRetentionRecords.find((row) => row.clubId === club.id),
  }
}

describe('the A02 fixtures at 2026-10-27', () => {
  it('match the access and retention the stories were written against', () => {
    for (const state of adminClubLicenseStates) {
      const terms = adminClubTerms.filter((row) => row.clubId === state.id)
      const _record: ClubRetentionRecord | undefined = adminClubRetentionRecords.find(
        (row) => row.clubId === state.id,
      )
      expect(terms.length > 0).toBe(state.hasTerms)
    }
  })
})
