import type { ClubAccessState } from '../license/license.types'
import { clubs } from './clubs'

/**
 * Admin directory extras from rotra-admin.html `seedClubs()` that the shared club fixture does not
 * carry: the accent logo, the running session under the name and a pending name change request.
 * Keyed by club username so the shared fixture stays the single source of identity and price.
 */
const directoryExtras: Record<
  string,
  { accent?: boolean; runningSessionTitle?: string; nameRequest?: string }
> = {
  'lahug.smash': {
    accent: true,
    runningSessionTitle: 'Tuesday Night Queue',
    nameRequest: 'Lahug Smashers',
  },
  'sampaloc.shuttle': { nameRequest: 'Sampaloc Shuttle Collective' },
}

export type AdminClubRow = {
  id: string
  name: string
  initials: string
  logoUrl: string | null
  accent: boolean
  username: string
  city: string
  locationCode: string
  pricing: 'paid' | 'free'
  monthlyMinor: number
  runningSessionTitle: string | null
  /** Requested new name, when a name change request is waiting */
  nameRequest: string | null
}

export const adminClubRows: AdminClubRow[] = clubs.map((club) => {
  const extra = directoryExtras[club.username] ?? {}
  return {
    id: club.id,
    name: club.name,
    initials: club.initials,
    logoUrl: club.logoUrl,
    accent: extra.accent ?? false,
    username: club.username,
    city: club.city,
    locationCode: club.locationCode,
    pricing: club.licensePricing,
    monthlyMinor: club.licenseMonthlyMinor,
    runningSessionTitle: extra.runningSessionTitle ?? null,
    nameRequest: extra.nameRequest ?? null,
  }
})

/**
 * One example of every access state the directory shows, using prototype terms (stories only; A02.8
 * computes the real state from license terms and today's date).
 */
export const clubAccessExamples = {
  active: { state: 'active', plan: 'Yearly', until: '2027-03-31', days: 153 },
  endsSoon: { state: 'active', plan: 'Monthly', until: '2026-11-02', days: 4 },
  endsTomorrow: { state: 'active', plan: 'Monthly', until: '2026-10-30', days: 1 },
  endsToday: { state: 'active', plan: 'Monthly', until: '2026-10-29', days: 0 },
  expired: {
    state: 'expired',
    plan: 'Monthly',
    ended: '2026-09-30',
    since: '2026-10-01',
    next: null,
  },
  scheduled: { state: 'scheduled', plan: 'Monthly', starts: '2026-11-15' },
  none: { state: 'none' },
} satisfies Record<string, ClubAccessState>

/** The fixed "now" the club detail fixtures are written against (Thursday evening, Manila). */
export const ADMIN_FIXTURE_NOW = new Date('2026-10-29T19:52:00+08:00')

/**
 * Club detail › Overview extras from rotra-admin.html `seedClubs()`: when the account was set up,
 * when a name change was sent (19 hours before ADMIN_FIXTURE_NOW, as the prototype seeds it), the
 * running session (started 52 minutes before) and Talamban's expiry exception. Keyed by username.
 */
const overviewExtras: Record<
  string,
  {
    setUpOn: string
    nameRequestedAt?: string
    runningSession?: { title: string; venueName: string; startedAt: string }
    sessionException?: string
  }
> = {
  'lahug.smash': {
    setUpOn: '2026-01-04',
    nameRequestedAt: '2026-10-29T00:52:00+08:00',
    runningSession: {
      title: 'Tuesday Night Queue',
      venueName: 'Lahug Sports Hub',
      startedAt: '2026-10-29T19:00:00+08:00',
    },
  },
  'itpark.badminton': { setUpOn: '2026-04-28' },
  'matina.smash': { setUpOn: '2026-02-10' },
  'sampaloc.shuttle': { setUpOn: '2026-07-01', nameRequestedAt: '2026-10-26T15:52:00+08:00' },
  'talamban.racket': {
    setUpOn: '2026-05-25',
    sessionException:
      'Wednesday Ladder Night was already running when the license ended on Sep 30. It was allowed to finish and synced at 12:40 AM on Oct 1. No new session can start until the license is renewed.',
  },
  'bacolod.rally': { setUpOn: '2025-12-12' },
  'molo.shuttle': { setUpOn: '2025-11-03' },
  'tagbilaran.circle': { setUpOn: '2026-10-20' },
}

export type AdminClubOverview = {
  id: string
  /** 'YYYY-MM-DD' the club account was set up */
  setUpOn: string
  /** When the waiting name change request was sent (ISO), or null */
  nameRequestedAt: string | null
  /** Earlier club names, oldest first; the prototype seeds none */
  earlierNames: string[]
  runningSession: { title: string; venueName: string; startedAt: string } | null
  /** Why a session ran past the license end, shown in place of the running session */
  sessionException: string | null
}

export const adminClubOverviews: AdminClubOverview[] = clubs.map((club) => {
  const extra = overviewExtras[club.username]
  return {
    id: club.id,
    setUpOn: extra?.setUpOn ?? '',
    nameRequestedAt: extra?.nameRequestedAt ?? null,
    earlierNames: [],
    runningSession: extra?.runningSession ?? null,
    sessionException: extra?.sessionException ?? null,
  }
})
