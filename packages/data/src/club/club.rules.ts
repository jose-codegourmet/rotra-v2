import {
  formatClubPriceLine as formatStoredPriceLine,
  yearlySavingPercent as savingPercent,
} from '@rotra/schema/club-price'
import { formatPeso } from '@rotra/schema/money'
import type { ClubAccessState } from '../license/license.types'
import type { AdminClubAccessFilter, Club } from './club.types'

export const DEFAULT_POST_TEMPLATE = `@everyone

{{ club_name }} {{ day }} queue
{{ club_description }}

where: {{ where }}
when: {{ when }}

{{ x_courts }} courts:
{{ courts }}

{{ tube_count }} tubes and brand
{{ x_tubes }}

Players
{{ players }}

Waitlist:
{{ waitlist }}

{{ court_rules }}`
export const DEFAULT_COURT_RULES =
  'Court rules:\n• Non-marking shoes only\n• Be ready within 2 minutes when your match is called\n• Winner-only scoring is fine; tell the Queue Master the result'
export const POST_KEYS = [
  ['club_name', 'Club name'],
  ['club_description', 'Club description'],
  ['title', 'Session title'],
  ['day', 'Weekday, e.g. Sunday'],
  ['date', 'Date'],
  ['where', 'Venue and address'],
  ['when', 'Date and time'],
  ['x_courts', 'Courts reserved (number)'],
  ['courts', 'Court names, one per line'],
  ['tube_count', 'Total tubes'],
  ['x_tubes', 'Tubes per brand'],
  ['player_count', 'Number of players'],
  ['players', 'Numbered player list'],
  ['waitlist', 'Waitlist'],
  ['mode', 'Mode'],
  ['minimum', 'Minimum games'],
  ['fee_per_head', 'Payment per player'],
  ['entrance_fee', 'Entrance fee'],
  ['court_rules', 'Court rules'],
] as const

export type PostInput = {
  club: { name: string; description: string; courtRules: string | null }
  session: {
    title: string
    scheduledStartAt: number
    scheduledEndAt: number
    venueName: string
    venueAddress: string
  }
  courts: { label: string }[]
  roster: { name: string; nickname: string | null }[]
  waitlist: { name: string }[]
  openSlots: number
  mode: 'chill' | 'fair' | 'hard'
  minimum: number
  finance?: {
    feePerHeadMinor?: number
    entranceFeeMinor?: number
    shuttles?: { name: string; tubes: number }[]
  }
}
export const formatTime = (time: number) =>
  new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
export function buildPostValues(input: PostInput): Record<string, string> {
  const { club, session, courts, roster, waitlist, finance } = input,
    start = new Date(session.scheduledStartAt)
  const mode = {
    chill: 'Chill (Aims for roughly 30% easy games per player)',
    fair: 'Fair (Mainly level-matched games, roughly 10% easy games)',
    hard: 'Hard (Demanding runs, including 2–3 consecutive games)',
  }
  const peso = (minor: number) =>
    `₱${(minor / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  return {
    club_name: club.name,
    club_description: club.description,
    title: session.title,
    day: start.toLocaleDateString('en-US', { weekday: 'long' }),
    date: start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    where: `${session.venueName}${session.venueAddress ? `, ${session.venueAddress}` : ''}`,
    when: `${start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · ${formatTime(session.scheduledStartAt)}–${formatTime(session.scheduledEndAt)}`,
    x_courts: String(courts.length),
    court_count: String(courts.length),
    courts: courts.map((c) => c.label).join('\n'),
    tube_count: String(finance?.shuttles?.reduce((n, s) => n + s.tubes, 0) ?? 0),
    x_tubes: finance?.shuttles?.length
      ? finance.shuttles.map((s) => `${s.tubes} × ${s.name}`).join('\n')
      : 'To be announced',
    player_count: String(roster.length),
    players: roster.length
      ? roster
          .map((p, i) => `${i + 1}. ${p.name}${p.nickname ? ` (${p.nickname})` : ''}`)
          .join('\n')
      : 'No players yet',
    waitlist: waitlist.length
      ? waitlist.map((p, i) => `${i + 1}. ${p.name}`).join('\n')
      : `None yet. ${input.openSlots} slot${input.openSlots === 1 ? '' : 's'} left.`,
    mode: mode[input.mode],
    minimum: `${input.minimum} games per player`,
    fee_per_head: finance?.feePerHeadMinor ? `${peso(finance.feePerHeadMinor)} per head` : 'Free',
    entrance_fee: finance?.entranceFeeMinor
      ? `${peso(finance.entranceFeeMinor)} per head (included)`
      : 'None',
    court_rules: club.courtRules ?? DEFAULT_COURT_RULES,
  }
}
export function fillPostTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? (values[key] ?? match) : match,
  )
}

/** A club's own license price as the club record stores it (integer centavos). */
export type ClubPrice = Pick<Club, 'licensePricing' | 'licenseMonthlyMinor' | 'licenseYearlyMinor'>

/**
 * rotra-admin.html savePct() for a club record. The formula lives once in @rotra/schema/club-price,
 * which the Admin price forms also use. A free club added without a paid price has none to save on.
 */
export function yearlySavingPercent(price: ClubPrice): number {
  return price.licenseMonthlyMinor > 0
    ? savingPercent(price.licenseMonthlyMinor, price.licenseYearlyMinor)
    : 0
}

/** "₱1,500 a month · ₱15,000 a year (17% off)" or "Free (tester club)" (rotra-admin.html priceLine). */
export function formatClubPriceLine(price: ClubPrice): string {
  return formatStoredPriceLine({
    pricing: price.licensePricing,
    monthlyMinor: price.licenseMonthlyMinor,
    yearlyMinor: price.licenseYearlyMinor,
  })
}

/** A recorded license amount: ₱0 is a free club's term (rotra-admin.html amountText). */
export function formatAmount(minor: number): string {
  return minor === 0 ? 'Free' : formatPeso(minor)
}

/** First letters of the first two words (rotra-admin.html initials()); 'C' when there are none. */
export function clubInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || 'C'
  )
}

/** rotra-admin.html plain(): trims, strips accents and lowercases, so "Lahúg" matches "lahug". */
export function plainIdentity(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** rotra-admin.html filterKey(): a scheduled license has no access yet, so it counts as 'none'. */
export function adminClubAccessFilter(
  access: ClubAccessState,
): Exclude<AdminClubAccessFilter, 'all'> {
  return access.state === 'scheduled' ? 'none' : access.state
}

/** Directory search: name, username, city, city code and earlier names, ignoring case and accents. */
export function matchesClubSearch(
  club: { name: string; username: string; city: string; cityCode: string; earlierNames: string[] },
  q: string | undefined,
): boolean {
  const needle = plainIdentity(q ?? '')
  if (!needle) return true
  return plainIdentity(
    [club.name, club.username, club.city, club.cityCode, ...club.earlierNames].join(' '),
  ).includes(needle)
}
