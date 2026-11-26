import {
  LEVEL_BANDS,
  type LevelBand,
  type LevelRestriction,
  type LevelSlots,
  levelRestrictionOf,
} from '@rotra/schema/level-restriction'
import type { PlayingLevel } from '../player/player.types'

/**
 * Level restrictions on slots (D-2026-11-19-12): the one place the allowed / full check lives.
 * Mock mode, the Route Handler services and the screens all call it. Written in TypeScript first;
 * its cases are `@rotra/rule-cases` `v1/roster/levelRestrictionBlock.json` and the Go copy follows.
 *
 * - A signed-in player outside the restriction, or whose band's slots are full, can't send a join
 *   request from the session page.
 * - A player with no level is allowed; the level the Queue Master picks when confirming counts.
 * - The Queue Master can still add or confirm anyone after a warning (the same reason, a second
 *   press). Adding to the waitlist isn't checked; neither is a slot given from the waitlist.
 */

/** A level's band (Beginner, Intermediate, Advanced); null without a level. */
export function levelBandOf(level: PlayingLevel | string | null | undefined): LevelBand | null {
  const band = level?.split('_')[0]
  return LEVEL_BANDS.find((b) => b === band) ?? null
}

/** Slots taken per band: the roster's players by their level's band. The waitlist doesn't count. */
export function levelBandCounts(levels: (PlayingLevel | string | null | undefined)[]): LevelSlots {
  const taken: LevelSlots = { beginner: 0, intermediate: 0, advanced: 0 }
  for (const level of levels) {
    const band = levelBandOf(level)
    if (band) taken[band] += 1
  }
  return taken
}

export const BEGINNERS_ONLY_ERROR = 'This session is for beginners only.'
export const BEGINNERS_INTERMEDIATE_ERROR = 'This session is for beginners to intermediate only.'

/**
 * Whether a player of this band may take a slot: null when allowed, otherwise the reason. `taken`
 * is `levelBandCounts` of the roster, read only for slots per level. A missing or unknown
 * restriction reads as All levels.
 */
export function levelRestrictionBlock(
  restriction: LevelRestriction | null | undefined,
  band: LevelBand | null,
  taken: Partial<LevelSlots> = {},
): string | null {
  if (!band) return null
  const { kind, slots } = levelRestrictionOf(restriction)
  if (kind === 'beginners' && band !== 'beginner') return BEGINNERS_ONLY_ERROR
  if (kind === 'beginners-intermediate' && band === 'advanced') return BEGINNERS_INTERMEDIATE_ERROR
  if (kind === 'per-level') {
    const total = slots?.[band] ?? 0
    if ((taken[band] ?? 0) >= total)
      return total ? `All ${total} ${band} slots are taken.` : `This session has no ${band} slots.`
  }
  return null
}

/**
 * The restriction check for a level against a session's roster levels; the level form of
 * `levelRestrictionBlock`.
 */
export function levelRestrictionBlockFor(
  restriction: LevelRestriction | null | undefined,
  level: PlayingLevel | string | null | undefined,
  rosterLevels: (PlayingLevel | string | null | undefined)[],
): string | null {
  return levelRestrictionBlock(restriction, levelBandOf(level), levelBandCounts(rosterLevels))
}
