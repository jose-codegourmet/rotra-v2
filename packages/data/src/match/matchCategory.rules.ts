import type { Gender } from '../club-player/clubPlayer.types'
import { FORMAT_LABELS } from './match.rules'
import type { MatchFormat } from './match.types'

/** What a match is called by who plays it (D-2026-11-19-07). */
export type MatchCategory = "Men's" | "Women's" | 'Mixed' | 'Genderless'
type Genders = readonly (Gender | null | undefined)[]

/**
 * Match category: all men Men's, all women Women's, both sides the same mix of men and women
 * Mixed, anything else Genderless, and any player whose gender isn't given makes it Genderless.
 * The same rule for every format.
 */
export function matchCategory(teams: { teamA: Genders; teamB: Genders }): MatchCategory {
  const { teamA: a, teamB: b } = teams
  const all = [...a, ...b]
  if (!all.length || all.some((g) => g !== 'male' && g !== 'female')) return 'Genderless'
  if (all.every((g) => g === 'male')) return "Men's"
  if (all.every((g) => g === 'female')) return "Women's"
  const mixed = (t: Genders) => t.includes('male') && t.includes('female')
  const key = (t: Genders) => [...t].sort().join()
  return mixed(a) && mixed(b) && key(a) === key(b) ? 'Mixed' : 'Genderless'
}

/** "Mixed Doubles", "Men's Doubles", "Women's Singles", "Genderless 3v3 fun". */
export const matchLabelOf = (format: MatchFormat, category: MatchCategory) =>
  `${category} ${FORMAT_LABELS[format]}`

/**
 * The label of a lineup, reading each player's gender from the roster rows (a player missing from
 * the roster counts as not given).
 */
export function matchLabel(
  lineup: { format: MatchFormat; teamA: string[]; teamB: string[] },
  roster: readonly { id: string; gender?: Gender | null }[],
) {
  const genders = (ids: string[]) => ids.map((id) => roster.find((p) => p.id === id)?.gender ?? null)
  return matchLabelOf(
    lineup.format,
    matchCategory({ teamA: genders(lineup.teamA), teamB: genders(lineup.teamB) }),
  )
}
