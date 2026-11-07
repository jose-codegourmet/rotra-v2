import { clockTimeFrom, courtTimeOnSession, instantOnDate } from '@rotra/schema/court-window'
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

/**
 * Setup values as full instants: the one place the clock-only time fields become instants until
 * the date-and-time picker (Q12.24) sends each day. The start is on the session date; the end and
 * each court time are the first such clock time from the start (the end strictly after it, so at
 * most 24 h later). An empty court start is the session start; an empty court end (null) follows
 * the session end. Validation then works on these instants only.
 */
export function sessionTimes(
  values: Pick<SessionSetupInput, 'date' | 'startTime' | 'endTime'> &
    Partial<Pick<SessionSetupInput, 'courtLabels' | 'courtStarts' | 'courtEnds'>>,
) {
  const start = instantOnDate(values.date, values.startTime)
  const end = clockTimeFrom(start + 60_000, values.endTime)
  const courts = (values.courtLabels ?? []).map((_, i) => {
    const from = values.courtStarts?.[i]
    const until = values.courtEnds?.[i]
    return {
      startsAt: from ? courtTimeOnSession(start, clockTimeFrom(start, from)) : start,
      openUntil: until ? clockTimeFrom(start, until) : null,
    }
  })
  return { start, end, courts }
}

/** The "HH:mm" a clock-only setup field holds for a picked instant. */
export function clockOf(instant: number): string {
  const date = new Date(instant)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** The calendar days a time field can fall on (the day of each bound), for the pickers. */
export function sessionDays(from: number, to: number): number[] {
  return Number.isFinite(from) && Number.isFinite(to) ? [from, to] : []
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

/** What a form submit does on a page: the last page saves, every earlier page acts as Next. */
export function setupSubmitAction(page: number, last: number): 'next' | 'save' {
  return page >= last ? 'save' : 'next'
}

const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'image'])

/** Whether Enter in this element is a browser implicit submission (text-like inputs only). */
export function isEnterSubmitTarget(el: { tagName: string; type?: string } | null): boolean {
  if (!el || el.tagName !== 'INPUT') return false
  return !NON_TEXT_INPUTS.has((el.type || 'text').toLowerCase())
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
