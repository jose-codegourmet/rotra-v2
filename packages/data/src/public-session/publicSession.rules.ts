import type { PlayingLevel } from '../player/player.types'
import type { PublicSkillMix } from './publicSession.types'

/**
 * Public participant names (owner decision, November 7, 2026; #475): each whitespace-separated word
 * becomes its first character plus a fixed "***", so "Jose Adrian" → "J*** A***" and "Mika" →
 * "M***". The fixed suffix never reveals a word's length. An empty or whitespace-only name reads
 * "Player". The first character is the first code point, so an emoji or accented letter stays whole.
 * Applied on the server (or the mock server) before a name enters `PublicSessionPage`.
 */
export function maskPublicName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'Player'
  return words.map((w) => `${Array.from(w)[0]}***`).join(' ')
}

/**
 * #474: aggregate skill mix for the public page, computed on the server (or the mock server) over
 * the same entries as the public participant list. Same level → group rule as the organizer
 * roster's Skill group (`rosterLevelFamily`): `advanced_low|mid|high` → advanced, and so on; a
 * missing or unknown level → unrated. Takes levels only and returns counts only, so no participant
 * can be mapped to a level.
 */
export function publicSkillMix(
  levels: (PlayingLevel | string | null | undefined)[],
): PublicSkillMix {
  const mix: PublicSkillMix = { beginner: 0, intermediate: 0, advanced: 0, unrated: 0 }
  for (const level of levels) {
    const band = level ? level.split('_')[0] : null
    if (band === 'beginner' || band === 'intermediate' || band === 'advanced') mix[band] += 1
    else mix.unrated += 1
  }
  return mix
}
