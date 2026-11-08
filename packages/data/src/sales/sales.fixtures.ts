import { addDays } from '../license/license.rules'
import type { ClubLicenseTerm } from '../license/license.types'
import type { SalesSessionRow, SalesSettings } from './sales.types'

/**
 * The mock Admin configuration's cost per session (D-2026-11-08-01): the ₱15 placeholder the
 * prototype shows until the owner sets the real figure. The mock store seeds it; rules read it from
 * the store, never from here.
 */
export const salesSettingsSeed: SalesSettings = {
  costPerSession: { amountMinor: 1500, currency: 'PHP' },
}

/**
 * rotra-admin.html club ids by username. The prototype draws its sample sessions from a hash of
 * `<prototype id>-<day>`, so hashing the same id gives the same figures as the prototype.
 */
const PROTOTYPE_CLUB_IDS: Record<string, string> = {
  'lahug.smash': 'c1',
  'itpark.badminton': 'c2',
  'matina.smash': 'c3',
  'sampaloc.shuttle': 'c4',
  'talamban.racket': 'c5',
  'bacolod.rally': 'c6',
  'molo.shuttle': 'c7',
  'tagbilaran.circle': 'c8',
}

/** How far back the sample runs: rotra-admin.html salesData() draws 365 × 2 days. */
export const SAMPLE_SALES_DAYS = 730

/** rotra-admin.html hashStr (32-bit FNV-1a). */
function hashStr(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Sample session history, added to the mock store's final sessions because the store only seeds a
 * few for the demo club. Drawn exactly as the prototype draws them: on a day a club's license term covers (free terms too), about two days in seven start
 * one session with 8 to 21 matches. Deterministic for a day, so a period always shows the same figures.
 * Drawn for the last {@link SAMPLE_SALES_DAYS} days up to and including `today`.
 */
export function sampleSalesSessions(
  clubs: readonly { id: string; username: string }[],
  terms: readonly Pick<ClubLicenseTerm, 'clubId' | 'startsAt' | 'endsAt'>[],
  today: string,
): SalesSessionRow[] {
  const rows: SalesSessionRow[] = []
  for (const club of clubs) {
    const own = terms.filter((term) => term.clubId === club.id)
    if (!own.length) continue
    const seed = PROTOTYPE_CLUB_IDS[club.username] ?? club.id
    for (let i = 0; i < SAMPLE_SALES_DAYS; i++) {
      const day = addDays(today, -i)
      if (!own.some((term) => term.startsAt <= day && day <= term.endsAt)) continue
      const h = hashStr(`${seed}-${day}`)
      if (h % 7 > 1) continue
      rows.push({ clubId: club.id, startedOn: day, matches: 8 + ((h >>> 5) % 14) })
    }
  }
  return rows
}
