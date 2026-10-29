import type {
  AdminClubRecord,
  ClubAccount,
  ClubNameChangeRequest,
} from '../club/club.types'
import type {
  ClubAccessState,
  ClubLicenseTerm,
  ClubRetentionRecord,
  RetentionState,
} from '../license/license.types'
import { clubs } from './clubs'
import { licensePayments, seededActivation } from './licensePayments'

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

/** The fixed "now" the club detail stories are written against (Thursday evening, Manila). */
export const ADMIN_FIXTURE_NOW = new Date('2026-10-29T19:52:00+08:00')

const MINUTE = 6e4,
  HOUR = 36e5,
  DAY = 864e5

/**
 * Club detail › Overview extras from rotra-admin.html `seedClubs()`: when the account was set up,
 * how long before "now" a name change was sent (Lahug 19 hours, Sampaloc 3 days 4 hours), the
 * running session (started 52 minutes before) and Talamban's expiry exception. Relative times are
 * offsets so the mock store can seed them from the real time, as the prototype does. Keyed by username.
 */
const overviewExtras: Record<
  string,
  {
    setUpOn: string
    nameRequest?: { name: string; sentBefore: number }
    runningSession?: { title: string; venueName: string; startedBefore: number }
    sessionException?: string
  }
> = {
  'lahug.smash': {
    setUpOn: '2026-01-04',
    nameRequest: { name: 'Lahug Smashers', sentBefore: 19 * HOUR },
    runningSession: {
      title: 'Tuesday Night Queue',
      venueName: 'Lahug Sports Hub',
      startedBefore: 52 * MINUTE,
    },
  },
  'itpark.badminton': { setUpOn: '2026-04-28' },
  'matina.smash': { setUpOn: '2026-02-10' },
  'sampaloc.shuttle': {
    setUpOn: '2026-07-01',
    nameRequest: { name: 'Sampaloc Shuttle Collective', sentBefore: 3 * DAY + 4 * HOUR },
  },
  'talamban.racket': {
    setUpOn: '2026-05-25',
    sessionException:
      'Wednesday Ladder Night was already running when the license ended on Sep 30. It was allowed to finish and synced at 12:40 AM on Oct 1. No new session can start until the license is renewed.',
  },
  'bacolod.rally': { setUpOn: '2025-12-12' },
  'molo.shuttle': { setUpOn: '2025-11-03' },
  'tagbilaran.circle': { setUpOn: '2026-10-20' },
}

/**
 * The Admin-side club records the mock store seeds: one account per club (set up at Manila midnight
 * of its prototype set-up day), the two pending name change requests and the Overview extras.
 */
export function createAdminClubFixtures(now: number): {
  clubAccounts: ClubAccount[]
  clubNameChangeRequests: ClubNameChangeRequest[]
  adminClubRecords: AdminClubRecord[]
} {
  const iso = (ms: number) => new Date(ms).toISOString()
  return {
    clubAccounts: clubs.map((club) => ({
      clubId: club.id,
      username: club.username,
      provisionedAt: `${overviewExtras[club.username]?.setUpOn ?? '2026-01-01'}T00:00:00+08:00`,
    })),
    clubNameChangeRequests: clubs.flatMap((club) => {
      const request = overviewExtras[club.username]?.nameRequest
      return request
        ? [
            {
              id: `name-request-${club.username}`,
              clubId: club.id,
              requestedName: request.name,
              requestedAt: iso(now - request.sentBefore),
              state: 'pending' as const,
            },
          ]
        : []
    }),
    adminClubRecords: clubs.map((club) => {
      const extra = overviewExtras[club.username]
      return {
        clubId: club.id,
        accent: directoryExtras[club.username]?.accent ?? false,
        earlierNames: [],
        runningSession: extra?.runningSession
          ? {
              title: extra.runningSession.title,
              venueName: extra.runningSession.venueName,
              startedAt: iso(now - extra.runningSession.startedBefore),
            }
          : null,
        expiryExceptionNote: extra?.sessionException ?? null,
      }
    }),
  }
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

const storyFixtures = createAdminClubFixtures(ADMIN_FIXTURE_NOW.getTime())

/** The Overview extras as they read at ADMIN_FIXTURE_NOW (stories). */
export const adminClubOverviews: AdminClubOverview[] = clubs.map((club) => {
  const record = storyFixtures.adminClubRecords.find((row) => row.clubId === club.id)
  return {
    id: club.id,
    setUpOn: overviewExtras[club.username]?.setUpOn ?? '',
    nameRequestedAt:
      storyFixtures.clubNameChangeRequests.find((row) => row.clubId === club.id)?.requestedAt ??
      null,
    earlierNames: record?.earlierNames ?? [],
    runningSession: record?.runningSession ?? null,
    sessionException: record?.expiryExceptionNote ?? null,
  }
})

/**
 * The day the license and retention examples below are computed for: the date the A02 tickets'
 * acceptance criteria are stated at (IT Park ends in 6 days). A02.8 computes the real values.
 */
export const ADMIN_LICENSE_TODAY = '2026-10-27'

function clubIdOf(username: string): string {
  const club = clubs.find((row) => row.username === username)
  if (!club) throw new Error(`Club fixture missing: ${username}`)
  return club.id
}

function term(
  username: string,
  ref: string,
  paidOn: string,
  plan: ClubLicenseTerm['plan'],
  startsAt: string,
  endsAt: string,
  pesos: number,
): ClubLicenseTerm {
  return {
    id: ref,
    clubId: clubIdOf(username),
    plan,
    startsAt,
    endsAt,
    amountMinor: pesos * 100,
    currency: 'PHP',
    paidOn,
    paymentReference: ref,
    ...seededActivation(paidOn, ref),
  }
}

/**
 * Every club's license terms from rotra-admin.html `seedClubs()`, newest first per club. Lahug's are
 * the shared `licensePayments` (the Queue demo club). Tagbilaran has none. Sample amounts.
 */
export const adminClubTerms: ClubLicenseTerm[] = [
  ...licensePayments,
  term('itpark.badminton', 'LIC-0009', '2026-10-03', 'Monthly', '2026-10-03', '2026-11-02', 1500),
  term('itpark.badminton', 'LIC-0008', '2026-09-03', 'Monthly', '2026-09-03', '2026-10-02', 1500),
  term('itpark.badminton', 'LIC-0007', '2026-08-03', 'Monthly', '2026-08-03', '2026-09-02', 1500),
  term('itpark.badminton', 'LIC-0006', '2026-06-01', 'Monthly', '2026-06-01', '2026-06-30', 1500),
  term('itpark.badminton', 'LIC-0005', '2026-05-01', 'Monthly', '2026-05-01', '2026-05-31', 1500),
  term('matina.smash', 'LIC-0010', '2026-02-14', 'Yearly', '2026-02-15', '2027-02-14', 15000),
  term('sampaloc.shuttle', 'LIC-0014', '2026-10-10', 'Monthly', '2026-10-10', '2026-11-09', 1500),
  term('sampaloc.shuttle', 'LIC-0013', '2026-09-10', 'Monthly', '2026-09-10', '2026-10-09', 1500),
  term('sampaloc.shuttle', 'LIC-0012', '2026-08-08', 'Monthly', '2026-08-10', '2026-09-09', 1500),
  term('sampaloc.shuttle', 'LIC-0011', '2026-07-10', 'Monthly', '2026-07-10', '2026-08-09', 1500),
  term('talamban.racket', 'LIC-0017', '2026-09-01', 'Monthly', '2026-09-01', '2026-09-30', 1500),
  term('talamban.racket', 'LIC-0016', '2026-08-01', 'Monthly', '2026-08-01', '2026-08-31', 1500),
  term('talamban.racket', 'LIC-0015', '2026-06-01', 'Monthly', '2026-06-01', '2026-07-31', 3000),
  term('bacolod.rally', 'LIC-0020', '2026-03-20', 'Monthly', '2026-03-20', '2026-04-19', 1500),
  term('bacolod.rally', 'LIC-0019', '2026-01-20', 'Monthly', '2026-01-20', '2026-03-19', 3000),
  term('molo.shuttle', 'LIC-0021', '2025-11-05', 'Monthly', '2025-11-05', '2026-03-31', 7500),
]

/** rotra-admin.html `c.ret` per club: IT Park's cancelled countdown, Bacolod's failed deletion, Molo's deleted pages. */
const retentionSeeds: Record<string, Omit<ClubRetentionRecord, 'clubId'>> = {
  'itpark.badminton': {
    cycles: [{ expired: '2026-07-01', cancelled: '2026-08-03' }],
    failedOn: null,
    deletedOn: null,
  },
  'bacolod.rally': { cycles: [], failedOn: '2026-10-20', deletedOn: null },
  'molo.shuttle': { cycles: [], failedOn: null, deletedOn: '2026-10-01' },
}

export const adminClubRetentionRecords: ClubRetentionRecord[] = clubs.map((club) => ({
  clubId: club.id,
  ...(retentionSeeds[club.username] ?? { cycles: [], failedOn: null, deletedOn: null }),
}))

/**
 * Access and retention for every club at ADMIN_LICENSE_TODAY, worked out by hand from the terms and
 * records above with the prototype's access() and retention() (stories only). The app computes them
 * with license.rules accessOf/retentionOf; license.rules.test checks they agree with these.
 */
const licenseStates: Record<string, { access: ClubAccessState; retention: RetentionState }> = {
  'lahug.smash': {
    access: { state: 'active', plan: 'Yearly', until: '2027-03-31', days: 155 },
    retention: { k: 'none' },
  },
  'itpark.badminton': {
    access: { state: 'active', plan: 'Monthly', until: '2026-11-02', days: 6 },
    retention: { k: 'restored', cycle: { expired: '2026-07-01', cancelled: '2026-08-03' } },
  },
  'matina.smash': {
    access: { state: 'active', plan: 'Yearly', until: '2027-02-14', days: 110 },
    retention: { k: 'none' },
  },
  'sampaloc.shuttle': {
    access: { state: 'active', plan: 'Monthly', until: '2026-11-09', days: 13 },
    retention: { k: 'none' },
  },
  'talamban.racket': {
    access: {
      state: 'expired',
      plan: 'Monthly',
      ended: '2026-09-30',
      since: '2026-10-01',
      next: null,
    },
    retention: {
      k: 'stale',
      deleteOn: '2027-04-01',
      since: '2026-10-01',
      left: 156,
      elapsed: 26,
      total: 182,
    },
  },
  'bacolod.rally': {
    access: {
      state: 'expired',
      plan: 'Monthly',
      ended: '2026-04-19',
      since: '2026-04-20',
      next: null,
    },
    retention: { k: 'failed', deleteOn: '2026-10-20', failedOn: '2026-10-20', since: '2026-04-20' },
  },
  'molo.shuttle': {
    access: {
      state: 'expired',
      plan: 'Monthly',
      ended: '2026-03-31',
      since: '2026-04-01',
      next: null,
    },
    retention: { k: 'deleted', on: '2026-10-01' },
  },
  'tagbilaran.circle': { access: { state: 'none' }, retention: { k: 'none' } },
}

export type AdminClubLicenseState = {
  id: string
  /** Whether the club has any recorded term (Activate license vs Renew license) */
  hasTerms: boolean
  access: ClubAccessState
  retention: RetentionState
}

export const adminClubLicenseStates: AdminClubLicenseState[] = clubs.map((club) => {
  const state = licenseStates[club.username]
  if (!state) throw new Error(`License state fixture missing: ${club.username}`)
  return {
    id: club.id,
    hasTerms: adminClubTerms.some((row) => row.clubId === club.id),
    ...state,
  }
})

/**
 * Retention examples no seeded club is in at ADMIN_LICENSE_TODAY (stories only): Bacolod's countdown
 * as it would read with deletion still running and no failed attempt.
 */
export const retentionExamples = {
  due: { k: 'due', deleteOn: '2026-10-20', since: '2026-04-20' },
} satisfies Record<string, RetentionState>
