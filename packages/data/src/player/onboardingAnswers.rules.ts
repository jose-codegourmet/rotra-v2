import {
  COURT_POSITIONS,
  type CourtPosition,
  FAVORITE_PLAYER_IDS,
  type FavoritePlayerId,
  SHOT_IDS,
  type ShotId,
} from './player.types'

/** Display names of the 12 listed shots, in the prototype's order (SKILLS); used for the no-repeat check. */
export const SHOT_LABELS: Record<ShotId, string> = {
  netting: 'Netting',
  smash: 'Smash',
  jump: 'Jump smash',
  drop: 'Drop',
  slice: 'Slice',
  clear: 'Clear',
  drive: 'Drive',
  lift: 'Lift',
  netkill: 'Net kill',
  push: 'Push',
  block: 'Block',
  backhand: 'Backhand clear',
}

export const MAX_OWN_SHOTS = 6
export const MAX_OWN_SHOT_LENGTH = 24

/** The getting-to-know answers (D-2026-11-19-11). Every answer is optional (skippable). */
export type OnboardingAnswers = {
  playStyle: CourtPosition | null
  shots: ShotId[]
  shotsOther: string[]
  favoritePlayer: FavoritePlayerId | null
  favoritePlayerOther: string
}

export const EMPTY_ONBOARDING_ANSWERS: OnboardingAnswers = {
  playStyle: null,
  shots: [],
  shotsOther: [],
  favoritePlayer: null,
  favoritePlayerOther: '',
}

const clean = (text: string) => text.trim().replace(/\s+/g, ' ')

/**
 * Checks and tidies the answers. Returns the first problem as a message, or the cleaned answers:
 * unknown ids rejected, listed shots deduplicated, own shots trimmed (max 6, 24 characters each, no
 * repeat of the list or of each other in any case), and the favourite's typed name kept only for Others.
 */
export function normalizeOnboardingAnswers(
  input: OnboardingAnswers,
): { answers: OnboardingAnswers; error?: undefined } | { answers?: undefined; error: string } {
  if (input.playStyle !== null && !COURT_POSITIONS.includes(input.playStyle))
    return { error: 'Choose where you play from the list.' }
  if (input.shots.some((shot) => !SHOT_IDS.includes(shot)))
    return { error: 'Choose shots from the list.' }
  if (input.favoritePlayer !== null && !FAVORITE_PLAYER_IDS.includes(input.favoritePlayer))
    return { error: 'Choose a favorite player from the list.' }
  if (input.shotsOther.length > MAX_OWN_SHOTS)
    return { error: `You can add up to ${MAX_OWN_SHOTS} of your own.` }
  const taken = new Set(SHOT_IDS.map((id) => SHOT_LABELS[id].toLowerCase()))
  const own: string[] = []
  for (const raw of input.shotsOther) {
    const shot = clean(raw)
    if (!shot) return { error: 'Type a shot first.' }
    if (shot.length > MAX_OWN_SHOT_LENGTH) return { error: 'Keep it to 24 characters or fewer.' }
    if (taken.has(shot.toLowerCase())) return { error: 'That shot is already on the list.' }
    taken.add(shot.toLowerCase())
    own.push(shot)
  }
  const favoritePlayerOther =
    input.favoritePlayer === 'other' ? clean(input.favoritePlayerOther) : ''
  return {
    answers: {
      playStyle: input.playStyle,
      shots: SHOT_IDS.filter((id) => input.shots.includes(id)),
      shotsOther: own,
      favoritePlayer: input.favoritePlayer,
      favoritePlayerOther,
    },
  }
}
