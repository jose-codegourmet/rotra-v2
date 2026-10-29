import { describe, expect, it } from 'vitest'
import type { ClubPrice } from '../club/club.rules'
import {
  ADMIN_LICENSE_TODAY,
  adminClubLicenseStates,
  adminClubRetentionRecords,
  adminClubTerms,
} from '../fixtures/adminClubs'
import { clubs } from '../fixtures/clubs'
import {
  accessOf,
  addMonths,
  defaultLicenseDraft,
  diffDays,
  formatTermRange,
  licenseAuditSummary,
  licenseEffects,
  manilaToday,
  overlapDays,
  planPriceMinor,
  retentionOf,
  termEnd,
} from './license.rules'
import type { ClubLicenseTerm, ClubRetentionRecord } from './license.types'

const TODAY = ADMIN_LICENSE_TODAY

function term(plan: ClubLicenseTerm['plan'], startsAt: string, endsAt: string): ClubLicenseTerm {
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

const noRecord = { cycles: [], failedOn: null, deletedOn: null }
const paid: ClubPrice = {
  licensePricing: 'paid',
  licenseMonthlyMinor: 150000,
  licenseYearlyMinor: 1500000,
}
const free: ClubPrice = { ...paid, licensePricing: 'free' }

function fixtureClub(username: string) {
  const club = clubs.find((row) => row.username === username)
  if (!club) throw new Error(`Club fixture missing: ${username}`)
  return {
    club,
    terms: adminClubTerms.filter((row) => row.clubId === club.id),
    record: adminClubRetentionRecords.find((row) => row.clubId === club.id),
  }
}

describe('dates (rotra-admin.html addMonths / diffDays)', () => {
  it('clamps to the end of a shorter month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-10-01', 6)).toBe('2027-04-01')
  })

  it('counts whole calendar days', () => {
    expect(diffDays('2026-10-27', '2027-03-31')).toBe(155)
    expect(diffDays('2026-10-01', '2027-04-01')).toBe(182)
    expect(diffDays('2026-10-27', '2026-10-27')).toBe(0)
  })

  it('reads today in Manila', () => {
    expect(manilaToday(new Date('2026-10-27T16:30:00Z'))).toBe('2026-10-28')
    expect(manilaToday(new Date('2026-10-27T15:59:00Z'))).toBe('2026-10-27')
  })

  it('writes a term range with the year once when it does not change', () => {
    expect(formatTermRange('2026-10-03', '2026-11-02')).toBe('Oct 3 – Nov 2, 2026')
    expect(formatTermRange('2026-04-01', '2027-03-31')).toBe('Apr 1, 2026 – Mar 31, 2027')
  })
})

describe('termEnd (rotra-admin.html termEnd())', () => {
  it('adds one month or twelve, less a day', () => {
    expect(termEnd('2026-10-03', 'Monthly')).toBe('2026-11-02')
    expect(termEnd('2026-02-01', 'Monthly')).toBe('2026-02-28')
    expect(termEnd('2026-04-01', 'Yearly')).toBe('2027-03-31')
    expect(termEnd('2026-02-15', 'Yearly')).toBe('2027-02-14')
  })

  it('clamps to month end before taking the day off', () => {
    expect(termEnd('2026-01-31', 'Monthly')).toBe('2026-02-27')
    expect(termEnd('2028-02-29', 'Yearly')).toBe('2029-02-27')
  })
})

describe('accessOf (rotra-admin.html access())', () => {
  it('has no license without terms', () => {
    expect(accessOf([], TODAY)).toEqual({ state: 'none' })
  })

  it('follows back-to-back terms into one continuous period', () => {
    const terms = [
      term('Monthly', '2026-10-01', '2026-10-31'),
      term('Monthly', '2026-11-01', '2026-11-30'),
      term('Yearly', '2026-12-01', '2027-11-30'),
    ]
    expect(accessOf(terms, TODAY)).toEqual({
      state: 'active',
      plan: 'Monthly',
      until: '2027-11-30',
      days: diffDays(TODAY, '2027-11-30'),
    })
  })

  it('stops at a gap', () => {
    const terms = [
      term('Monthly', '2026-10-01', '2026-10-31'),
      term('Monthly', '2026-11-02', '2026-12-01'),
    ]
    expect(accessOf(terms, TODAY)).toMatchObject({ state: 'active', until: '2026-10-31', days: 4 })
  })

  it('counts the last day as day 0', () => {
    expect(accessOf([term('Monthly', '2026-09-28', TODAY)], TODAY)).toMatchObject({ days: 0 })
  })

  it('is scheduled when the only term starts later', () => {
    expect(accessOf([term('Monthly', '2026-11-15', '2026-12-14')], TODAY)).toEqual({
      state: 'scheduled',
      plan: 'Monthly',
      starts: '2026-11-15',
    })
  })

  it('is expired from the day after the last term ended, with any later term', () => {
    const terms = [
      term('Monthly', '2026-08-01', '2026-08-31'),
      term('Monthly', '2026-09-01', '2026-09-30'),
      term('Monthly', '2026-11-15', '2026-12-14'),
    ]
    expect(accessOf(terms, TODAY)).toEqual({
      state: 'expired',
      plan: 'Monthly',
      ended: '2026-09-30',
      since: '2026-10-01',
      next: '2026-11-15',
    })
  })
})

describe('retentionOf (rotra-admin.html retention())', () => {
  const ended = [term('Monthly', '2026-09-01', '2026-09-30')]

  it('counts six months from the first unlicensed day', () => {
    expect(retentionOf(ended, noRecord, TODAY)).toEqual({
      k: 'stale',
      deleteOn: '2027-04-01',
      since: '2026-10-01',
      left: 156,
      elapsed: 26,
      total: 182,
    })
  })

  it('measures continuous expiry from the terms, never from anything else', () => {
    // A backdated term that ended later moves the start of continuous expiry.
    const later = [...ended, term('Monthly', '2026-10-01', '2026-10-20')]
    expect(retentionOf(later, noRecord, TODAY)).toMatchObject({
      k: 'stale',
      since: '2026-10-21',
      deleteOn: '2027-04-21',
    })
  })

  it('is due once the delete day is reached, and deleted only once deletion finished', () => {
    expect(retentionOf(ended, noRecord, '2027-04-01')).toEqual({
      k: 'due',
      deleteOn: '2027-04-01',
      since: '2026-10-01',
    })
    expect(retentionOf(ended, { ...noRecord, deletedOn: '2027-04-02' }, '2027-04-05')).toEqual({
      k: 'deleted',
      on: '2027-04-02',
    })
  })

  it('reports a failed deletion for the current expiry', () => {
    expect(retentionOf(ended, { ...noRecord, failedOn: '2027-04-01' }, '2027-04-03')).toEqual({
      k: 'failed',
      deleteOn: '2027-04-01',
      failedOn: '2027-04-01',
      since: '2026-10-01',
    })
  })

  it('renewing before deletion cancels the countdown; a later expiry starts a new one', () => {
    const renewed = [...ended, term('Monthly', TODAY, termEnd(TODAY, 'Monthly'))]
    const record = { ...noRecord, cycles: [{ expired: '2026-10-01', cancelled: TODAY }] }
    expect(retentionOf(renewed, record, TODAY)).toEqual({
      k: 'restored',
      cycle: { expired: '2026-10-01', cancelled: TODAY },
    })
    // The renewal ends Nov 26; the next countdown runs from Nov 27, not from Oct 1.
    expect(retentionOf(renewed, record, '2026-12-01')).toEqual({
      k: 'stale',
      deleteOn: '2027-05-27',
      since: '2026-11-27',
      left: diffDays('2026-12-01', '2027-05-27'),
      elapsed: 4,
      total: diffDays('2026-11-27', '2027-05-27'),
    })
  })

  it('does not carry a failed deletion into a later expiry', () => {
    const renewed = [...ended, term('Monthly', TODAY, termEnd(TODAY, 'Monthly'))]
    const record = { ...noRecord, failedOn: '2026-10-20' }
    expect(retentionOf(renewed, record, '2026-12-01')).toMatchObject({ k: 'stale' })
  })
})

describe('the A02 fixtures at 2026-10-27', () => {
  it('match the access and retention the stories were written against', () => {
    for (const state of adminClubLicenseStates) {
      const terms = adminClubTerms.filter((row) => row.clubId === state.id)
      const record: ClubRetentionRecord | undefined = adminClubRetentionRecords.find(
        (row) => row.clubId === state.id,
      )
      expect(accessOf(terms, TODAY)).toEqual(state.access)
      expect(retentionOf(terms, record, TODAY)).toEqual(state.retention)
      expect(terms.length > 0).toBe(state.hasTerms)
    }
  })

  it('give the acceptance states', () => {
    const lahug = fixtureClub('lahug.smash')
    expect(accessOf(lahug.terms, TODAY)).toMatchObject({ state: 'active', until: '2027-03-31' })
    const itPark = fixtureClub('itpark.badminton')
    expect(accessOf(itPark.terms, TODAY)).toMatchObject({ state: 'active', days: 6 })
    expect(retentionOf(itPark.terms, itPark.record, TODAY)).toMatchObject({ k: 'restored' })
    const talamban = fixtureClub('talamban.racket')
    expect(accessOf(talamban.terms, TODAY)).toMatchObject({ state: 'expired', since: '2026-10-01' })
    expect(retentionOf(talamban.terms, talamban.record, TODAY)).toMatchObject({
      k: 'stale',
      deleteOn: '2027-04-01',
    })
    const bacolod = fixtureClub('bacolod.rally')
    expect(retentionOf(bacolod.terms, bacolod.record, TODAY)).toMatchObject({ k: 'failed' })
    const molo = fixtureClub('molo.shuttle')
    expect(retentionOf(molo.terms, molo.record, TODAY)).toEqual({ k: 'deleted', on: '2026-10-01' })
    const tagbilaran = fixtureClub('tagbilaran.circle')
    expect(accessOf(tagbilaran.terms, TODAY)).toEqual({ state: 'none' })
  })
})

describe('amounts', () => {
  it("uses the club's price for the plan, and 0 for a free club", () => {
    expect(planPriceMinor(paid, 'Monthly')).toBe(150000)
    expect(planPriceMinor(paid, 'Yearly')).toBe(1500000)
    expect(planPriceMinor(free, 'Yearly')).toBe(0)
  })

  it('records a free term as Free in the record', () => {
    const freeTerm = { ...term('Monthly', TODAY, '2026-11-26'), amountMinor: 0 }
    expect(licenseAuditSummary('Activated', freeTerm)).toBe(
      'Activated license: Monthly, Oct 27 – Nov 26, 2026 · Free.',
    )
  })

  it('writes the record line with the reference and the retention sentence', () => {
    const renewal = { ...term('Monthly', '2026-10-03', '2026-11-02'), paymentReference: 'LIC-0009' }
    expect(licenseAuditSummary('Renewed', renewal)).toBe(
      'Renewed license: Monthly, Oct 3 – Nov 2, 2026 · ₱1,500 · LIC-0009.',
    )
    expect(
      licenseAuditSummary(
        'Renewed',
        renewal,
        ' Public pages restored; deletion countdown from Oct 1, 2026 cancelled.',
      ),
    ).toBe(
      'Renewed license: Monthly, Oct 3 – Nov 2, 2026 · ₱1,500 · LIC-0009. Public pages restored; deletion countdown from Oct 1, 2026 cancelled.',
    )
  })
})

describe('defaultLicenseDraft (rotra-admin.html licStart())', () => {
  it('renews an active club from the day after access ends, at the latest plan and price', () => {
    const { club, terms } = fixtureClub('lahug.smash')
    expect(defaultLicenseDraft(club, terms, TODAY)).toEqual({
      plan: 'Yearly',
      startsOn: '2027-04-01',
      paidOn: TODAY,
      amountMinor: club.licenseYearlyMinor,
      reference: '',
    })
  })

  it('starts an expired club today', () => {
    const { club, terms } = fixtureClub('talamban.racket')
    expect(defaultLicenseDraft(club, terms, TODAY)).toMatchObject({
      plan: 'Monthly',
      startsOn: TODAY,
      amountMinor: club.licenseMonthlyMinor,
    })
  })

  it('leaves the plan and amount empty for a paid club never licensed, and 0 for a free one', () => {
    expect(defaultLicenseDraft(paid, [], TODAY)).toEqual({
      plan: null,
      startsOn: TODAY,
      paidOn: TODAY,
      amountMinor: null,
      reference: '',
    })
    expect(defaultLicenseDraft(free, [], TODAY)).toMatchObject({ plan: null, amountMinor: 0 })
  })
})

describe('D-LICENSE overlap and effects (rotra-admin.html licEffects())', () => {
  it('counts the days a new term starts inside the active period', () => {
    const active = accessOf([term('Monthly', '2026-10-10', '2026-11-09')], TODAY)
    expect(overlapDays(active, { startsOn: '2026-11-10' })).toBe(0)
    expect(overlapDays(active, { startsOn: '2026-11-09' })).toBe(1)
    expect(overlapDays(active, { startsOn: TODAY })).toBe(14)
    expect(overlapDays({ state: 'none' }, { startsOn: TODAY })).toBe(0)
  })

  it('lists what a renewal of an active club does', () => {
    const { club, terms, record } = fixtureClub('sampaloc.shuttle')
    const access = accessOf(terms, TODAY)
    const retention = retentionOf(terms, record, TODAY)
    const draft = { plan: 'Monthly' as const, startsOn: '2026-11-10' }
    expect(licenseEffects(club, access, retention, draft, TODAY)).toEqual([
      `${club.name} can use the Queue app from Nov 10, 2026 to Dec 9, 2026.`,
      'Still one active session at a time.',
      'Adds a payment record the club sees in Club settings.',
    ])
  })

  it('says an expired club gets its stale pages back', () => {
    const { club, terms, record } = fixtureClub('talamban.racket')
    const effects = licenseEffects(
      club,
      accessOf(terms, TODAY),
      retentionOf(terms, record, TODAY),
      { plan: 'Monthly', startsOn: TODAY },
      TODAY,
    )
    expect(effects[1]).toBe(
      "Restores the club's stale public pages and cancels the deletion scheduled for Apr 1, 2027.",
    )
  })

  it('says a failed retry is cancelled, deleted pages stay deleted and a later start waits', () => {
    const bacolod = fixtureClub('bacolod.rally')
    const effectsFrom = (startsOn: string) =>
      licenseEffects(
        bacolod.club,
        accessOf(bacolod.terms, TODAY),
        retentionOf(bacolod.terms, bacolod.record, TODAY),
        { plan: 'Monthly', startsOn },
        TODAY,
      )
    expect(effectsFrom(TODAY)[1]).toBe(
      "Restores the club's stale public pages and cancels the pending deletion retry.",
    )
    expect(effectsFrom('2026-11-01')[1]).toBe(
      'Until Nov 1, 2026 the club stays expired and its public pages stay stale.',
    )
    const molo = fixtureClub('molo.shuttle')
    expect(
      licenseEffects(
        molo.club,
        accessOf(molo.terms, TODAY),
        retentionOf(molo.terms, molo.record, TODAY),
        { plan: 'Monthly', startsOn: TODAY },
        TODAY,
      )[1],
    ).toBe(
      "The public pages deleted on Oct 1, 2026 don't come back. Player match history and ranks were kept.",
    )
  })
})
