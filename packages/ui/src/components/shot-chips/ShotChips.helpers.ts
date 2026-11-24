/** The 12 listed shots, in the prototype's order (SKILLS). */
export const SHOTS: { value: string; label: string }[] = [
  { value: 'netting', label: 'Netting' },
  { value: 'smash', label: 'Smash' },
  { value: 'jump', label: 'Jump smash' },
  { value: 'drop', label: 'Drop' },
  { value: 'slice', label: 'Slice' },
  { value: 'clear', label: 'Clear' },
  { value: 'drive', label: 'Drive' },
  { value: 'lift', label: 'Lift' },
  { value: 'netkill', label: 'Net kill' },
  { value: 'push', label: 'Push' },
  { value: 'block', label: 'Block' },
  { value: 'backhand', label: 'Backhand clear' },
]

export const MAX_OWN_SHOTS = 6
export const MAX_OWN_SHOT_LENGTH = 24

export type OwnShotResult = { shot: string; error?: undefined } | { shot?: undefined; error: string }

/**
 * Checks a shot a player typed under Others: trims and collapses spaces, then rejects empty, over 24
 * characters, a repeat of the list or of their own shots (any case), or a 7th own shot. The order of
 * the checks is the prototype's skillAdd.
 */
export function validateOwnShot(input: string, own: string[]): OwnShotResult {
  const shot = input.trim().replace(/\s+/g, ' ')
  const taken = [...SHOTS.map((s) => s.label), ...own].some(
    (x) => x.toLowerCase() === shot.toLowerCase(),
  )
  if (!shot) return { error: 'Type a shot first.' }
  if (shot.length > MAX_OWN_SHOT_LENGTH) return { error: 'Keep it to 24 characters or fewer.' }
  if (taken) return { error: 'That shot is already on the list.' }
  if (own.length >= MAX_OWN_SHOTS) return { error: 'You can add up to 6 of your own.' }
  return { shot }
}
