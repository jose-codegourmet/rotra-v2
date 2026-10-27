import type { SessionSetupInput } from './SessionSetupForm.schema'

const minutesOf = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Minutes between the start and end times; an end at or before the start means the next day. */
export function durationMinutes(values: Pick<SessionSetupInput, 'startTime' | 'endTime'>): number {
  const d = (minutesOf(values.endTime) - minutesOf(values.startTime) + 1440) % 1440
  return d || 1440
}

export function isOvernight(values: Pick<SessionSetupInput, 'startTime' | 'endTime'>): boolean {
  return minutesOf(values.endTime) <= minutesOf(values.startTime)
}

/** "3 h", "2 h 30 min" */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h} h${m ? ` ${m} min` : ''}`
}

/** Local start and end timestamps for the date and times */
export function sessionTimes(values: Pick<SessionSetupInput, 'date' | 'startTime' | 'endTime'>) {
  const [y = 0, mo = 1, d = 1] = values.date.split('-').map(Number)
  const at = (hhmm: string) => {
    const [h = 0, mi = 0] = hhmm.split(':').map(Number)
    return new Date(y, mo - 1, d, h, mi).getTime()
  }
  const start = at(values.startTime)
  let end = at(values.endTime)
  if (end <= start) end += 864e5
  return { start, end }
}

export function slotBudget(values: Pick<SessionSetupInput, 'courtLabels' | 'playersPerCourt'>) {
  return values.courtLabels.length * values.playersPerCourt
}

/** "Singles + Doubles", "Doubles", or "No standard format" */
export function formatsLabel(values: Pick<SessionSetupInput, 'allowSingles' | 'allowDoubles'>) {
  return (
    [values.allowSingles && 'Singles', values.allowDoubles && 'Doubles']
      .filter(Boolean)
      .join(' + ') || 'No standard format'
  )
}

/** "mixed doubles and singles", "singles", "doubles" */
export function formatMixLabel(values: Pick<SessionSetupInput, 'allowSingles' | 'allowDoubles'>) {
  return values.allowDoubles && values.allowSingles
    ? 'mixed doubles and singles'
    : values.allowSingles
      ? 'singles'
      : 'doubles'
}

/** Players on court per game: doubles 4, singles 2, both 10/3 (about two doubles to one singles) */
export function playersPerGame(values: Pick<SessionSetupInput, 'allowSingles' | 'allowDoubles'>) {
  return values.allowDoubles && values.allowSingles ? 10 / 3 : values.allowSingles ? 2 : 4
}

export const MODE_OPTIONS = [
  { value: 'chill', label: 'Chill', text: 'Aims for roughly 30% easy games per player.' },
  { value: 'fair', label: 'Fair', text: 'Mainly level-matched games, roughly 10% easy games.' },
  { value: 'hard', label: 'Hard', text: 'Demanding runs, including 2–3 consecutive games.' },
] as const

export const REPEAT_LABEL = {
  none: 'Does not repeat',
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  monthly: 'Every month',
} as const
