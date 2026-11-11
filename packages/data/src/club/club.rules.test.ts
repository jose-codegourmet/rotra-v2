import { describe, expect, it } from 'vitest'
import { clubAccessExamples } from '../fixtures/adminClubs'
import { clubs } from '../fixtures/clubs'
import {
  adminClubAccessFilter,
  buildPostValues,
  type ClubPrice,
  clubInitials,
  DEFAULT_POST_TEMPLATE,
  fillPostTemplate,
  formatAmount,
  formatClubPriceLine,
  matchesClubSearch,
  plainIdentity,
  yearlySavingPercent,
} from './club.rules'

const paid = (monthlyPesos: number, yearlyPesos: number): ClubPrice => ({
  licensePricing: 'paid',
  licenseMonthlyMinor: monthlyPesos * 100,
  licenseYearlyMinor: yearlyPesos * 100,
})

describe('club price rules (rotra-admin.html savePct / priceLine / amountText)', () => {
  it('rounds the yearly saving over twelve months to a whole percent', () => {
    expect(yearlySavingPercent(paid(1500, 15000))).toBe(17)
    expect(yearlySavingPercent(paid(1200, 12000))).toBe(17)
    expect(yearlySavingPercent(paid(1000, 6000))).toBe(50)
    expect(yearlySavingPercent(paid(1500, 18000))).toBe(0)
    expect(
      yearlySavingPercent({
        licensePricing: 'free',
        licenseMonthlyMinor: 0,
        licenseYearlyMinor: 0,
      }),
    ).toBe(0)
  })

  it('formats a paid price as one line with the saving', () => {
    expect(formatClubPriceLine(paid(1500, 15000))).toBe('₱1,500 a month · ₱15,000 a year (17% off)')
    expect(formatClubPriceLine(paid(1800, 18000))).toBe('₱1,800 a month · ₱18,000 a year (17% off)')
  })

  it('leaves the saving out when there is none', () => {
    expect(formatClubPriceLine(paid(1500, 18000))).toBe('₱1,500 a month · ₱18,000 a year')
  })

  it('shows a free club as a tester club, whatever amounts it kept', () => {
    expect(
      formatClubPriceLine({
        licensePricing: 'free',
        licenseMonthlyMinor: 100000,
        licenseYearlyMinor: 1000000,
      }),
    ).toBe('Free (tester club)')
    expect(
      formatClubPriceLine({
        licensePricing: 'free',
        licenseMonthlyMinor: 0,
        licenseYearlyMinor: 0,
      }),
    ).toBe('Free (tester club)')
  })

  it('formats every seeded club price from SEED_PRICE', () => {
    expect(clubs.map((club) => formatClubPriceLine(club))).toEqual([
      '₱1,500 a month · ₱15,000 a year (17% off)',
      '₱1,500 a month · ₱15,000 a year (17% off)',
      '₱1,200 a month · ₱12,000 a year (17% off)',
      '₱1,800 a month · ₱18,000 a year (17% off)',
      '₱1,500 a month · ₱15,000 a year (17% off)',
      '₱1,500 a month · ₱15,000 a year (17% off)',
      '₱1,500 a month · ₱15,000 a year (17% off)',
      'Free (tester club)',
    ])
  })

  it('shows a recorded ₱0 amount as Free and other amounts in pesos', () => {
    expect(formatAmount(0)).toBe('Free')
    expect(formatAmount(150000)).toBe('₱1,500')
    expect(formatAmount(1500000)).toBe('₱15,000')
    expect(formatAmount(150050)).toBe('₱1,500.50')
  })
})

describe('club identity rules', () => {
  it('takes the first letters of the first two words', () => {
    expect(clubInitials('Lahug Smashers')).toBe('LS')
    expect(clubInitials('  sampaloc   shuttle collective ')).toBe('SS')
    expect(clubInitials('Molo')).toBe('M')
    expect(clubInitials('   ')).toBe('C')
  })

  it('compares names and usernames ignoring case, accents and outer spaces', () => {
    expect(plainIdentity(' Lahúg Smash CLUB ')).toBe(plainIdentity('lahug smash club'))
    expect(plainIdentity('LAHUG.SMASH')).toBe('lahug.smash')
    expect(plainIdentity('Iñigo')).toBe('inigo')
  })

  it('counts a scheduled license as no license in the directory filter', () => {
    expect(adminClubAccessFilter(clubAccessExamples.active)).toBe('active')
    expect(adminClubAccessFilter(clubAccessExamples.expired)).toBe('expired')
    expect(adminClubAccessFilter(clubAccessExamples.scheduled)).toBe('none')
    expect(adminClubAccessFilter(clubAccessExamples.none)).toBe('none')
  })

  it('searches name, username, city, code and earlier names', () => {
    const club = {
      name: 'Lahug Smashers',
      username: 'lahug.smash',
      city: 'Cebu City',
      cityCode: 'PH-CEB',
      earlierNames: ['Lahug Smash Club'],
    }
    expect(matchesClubSearch(club, undefined)).toBe(true)
    expect(matchesClubSearch(club, '  ')).toBe(true)
    expect(matchesClubSearch(club, 'SMASHERS')).toBe(true)
    expect(matchesClubSearch(club, 'lahug.smash')).toBe(true)
    expect(matchesClubSearch(club, 'cebú')).toBe(true)
    expect(matchesClubSearch(club, 'ph-ceb')).toBe(true)
    expect(matchesClubSearch(club, 'smash club')).toBe(true)
    expect(matchesClubSearch(club, 'manila')).toBe(false)
  })
})

describe('Facebook post court times and join line (#730)', () => {
  const at = (h: number, m = 0, day = 11) => new Date(2026, 10, day, h, m).getTime()
  const base = {
    club: { name: 'Club', description: '', courtRules: null },
    session: {
      title: 'Night',
      scheduledStartAt: at(19, 30),
      scheduledEndAt: at(22, 30),
      venueName: 'Hall',
      venueAddress: '',
    },
    roster: [],
    waitlist: [],
    openSlots: 0,
    mode: 'fair' as const,
    minimum: 3,
    joinUrl: 'https://x.test/s/abc123',
  }
  it('puts each court time on its line, falling back to the session time', () => {
    const values = buildPostValues({
      ...base,
      courts: [
        { label: 'Court 1' },
        { label: 'Court 2', startsAt: at(20), openUntil: at(21, 30) },
        { label: 'Court 3', openUntil: at(23, 30, 12) },
      ],
    })
    expect(values.courts).toBe(
      'Court 1 · 7:30 PM–10:30 PM\nCourt 2 · 8:00 PM–9:30 PM\nCourt 3 · 7:30 PM–11:30 PM · next day',
    )
  })
  it('fills the join line and appends it when a saved template lacks the key', () => {
    const values = buildPostValues({ ...base, courts: [] })
    const line = 'To join and see the full roster, open this link: https://x.test/s/abc123'
    expect(values.join_link).toBe(line)
    expect(fillPostTemplate('Hi {{ title }}\n', values)).toBe(`Hi Night\n\n${line}`)
    expect(fillPostTemplate('{{ join_link }}\nBye', values)).toBe(`${line}\nBye`)
    expect(DEFAULT_POST_TEMPLATE.trimEnd().endsWith('{{ join_link }}')).toBe(true)
  })
})
