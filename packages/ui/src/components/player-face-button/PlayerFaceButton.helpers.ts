import { queueTime } from '@rotra/schema/queue-time'
import type { StatusPillValue } from '@rotra/ui/status-pill'

/**
 * Status under a Main Queue name: minutes since last game (In queue), or why that player is busy or
 * absent. `courtLabel` names the court in the pill's hover; Playing's `minutes` is since that match
 * began.
 */
export type PlayerWait =
  | { kind: 'minutes'; minutes: number }
  | { kind: 'on-court'; courtLabel?: string }
  | { kind: 'playing'; courtLabel?: string; minutes?: number }
  | { kind: 'not-here' }

/**
 * The pill under a Main Queue face (owner, November 25, 2026): a present player in the queued match
 * reads "In queue Nm"; busy elsewhere "Playing Nm" or "Getting ready"; absent "Away".
 */
export function waitPill(wait: PlayerWait): StatusPillValue {
  switch (wait.kind) {
    case 'minutes':
      return { kind: 'queued', minutes: wait.minutes }
    case 'on-court':
      return { kind: 'ready', courtLabel: wait.courtLabel ?? 'court' }
    case 'playing':
      return { kind: 'playing', minutes: wait.minutes ?? 0, courtLabel: wait.courtLabel ?? 'court' }
    case 'not-here':
      return { kind: 'away' }
  }
}

/** Visible wait line under a queue-card name: "M min", or why the player is busy or absent. */
export function waitCopy(wait: PlayerWait): string {
  switch (wait.kind) {
    case 'minutes':
      return queueTime(wait.minutes)
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
  const insert = `, waiting ${queueTime(wait.minutes)}`
  const marker = '. View profile'
  const at = label.indexOf(marker)
  return at === -1 ? `${label}${insert}` : `${label.slice(0, at)}${insert}${label.slice(at)}`
}
