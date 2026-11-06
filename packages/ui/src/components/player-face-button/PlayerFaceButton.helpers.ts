/** Wait under a queue-card name: minutes since last game, or why a timer is replaced. */
export type PlayerWait =
  | { kind: 'minutes'; minutes: number }
  | { kind: 'on-court' }
  | { kind: 'playing' }
  | { kind: 'not-here' }

/** Visible wait line under a queue-card name: "M min", or why the player is busy or absent. */
export function waitCopy(wait: PlayerWait): string {
  switch (wait.kind) {
    case 'minutes':
      return `${wait.minutes} min`
    case 'on-court':
      return 'On court'
    case 'playing':
      return 'Playing'
    case 'not-here':
      return 'Not here'
  }
}

/** Under 10 min plain, 10–15 warning, 16+ error; busy/absent stay muted. Color is never the only signal. */
export function waitClassName(wait: PlayerWait): string {
  if (wait.kind !== 'minutes') return 'text-fg2'
  if (wait.minutes >= 16) return 'text-error'
  if (wait.minutes >= 10) return 'text-warn'
  return 'text-fg2'
}

/**
 * Prototype waitLabel(): insert ", waiting M min" before ". View profile". Busy and absent players
 * keep the timer off the accessible name.
 */
export function labelWithWait(label: string, wait: PlayerWait | undefined): string {
  if (!wait || wait.kind !== 'minutes') return label
  const insert = `, waiting ${wait.minutes} min`
  const marker = '. View profile'
  const at = label.indexOf(marker)
  return at === -1 ? `${label}${insert}` : `${label.slice(0, at)}${insert}${label.slice(at)}`
}
