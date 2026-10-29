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
