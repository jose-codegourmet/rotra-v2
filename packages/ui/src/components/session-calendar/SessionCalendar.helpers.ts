export type CalendarEventKind = 'live' | 'prepared' | 'completed' | 'invalid'

export type CalendarEvent = {
  sessionId: string
  title: string
  venueName: string
  startsAt: number
  endsAt: number
  kind: CalendarEventKind
}

export type CalendarView = 'month' | 'week' | 'day'

const DAY = 864e5

/** Midnight at the start of that day, in local time. */
export function startOfDay(at: number): number {
  return new Date(at).setHours(0, 0, 0, 0)
}

/** "2026-10-27": one key per local calendar day, like the prototype's dayKey. */
export function dayKey(at: number): string {
  const d = new Date(at)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** The seven days (Sunday first) of the week holding `at`. */
export function weekOf(at: number): number[] {
  const r = new Date(at)
  const sunday = new Date(r.getFullYear(), r.getMonth(), r.getDate() - r.getDay())
  return Array.from({ length: 7 }, (_, i) =>
    new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i).getTime(),
  )
}

/** Whether two times fall on the same local day. */
export function sameDay(a: number, b: number): boolean {
  return dayKey(a) === dayKey(b)
}

/** Whether the day is today or later (the create action is only offered then). */
export function isTodayOrLater(at: number, today: number): boolean {
  return startOfDay(at) >= startOfDay(today)
}

export function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** "Tuesday, October 27" */
export function formatDayTitle(at: number): string {
  return new Date(at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

/** "October 2026" */
export function formatMonthTitle(at: number): string {
  return new Date(at).toLocaleDateString([], { month: 'long', year: 'numeric' })
}

/** "Oct 25 – 31, 2026" or "Oct 29 – Nov 4, 2026" */
export function formatWeekTitle(days: number[]): string {
  const a = new Date(days[0] ?? 0)
  const b = new Date(days[6] ?? 0)
  const sameMonth = a.getMonth() === b.getMonth()
  const from = a.toLocaleDateString([], { month: 'short', day: 'numeric' })
  const to = b.toLocaleDateString([], { month: sameMonth ? undefined : 'short', day: 'numeric' })
  return `${from} – ${to}, ${b.getFullYear()}`
}

/** Events grouped by local day, each day's list sorted by start. */
export function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()
  for (const event of [...events].sort((a, b) => a.startsAt - b.startsAt)) {
    const key = dayKey(event.startsAt)
    const list = map.get(key)
    if (list) list.push(event)
    else map.set(key, [event])
  }
  return map
}

/** The chip text per state, as the legend and day sheet show it. */
export const KIND_LABEL: Record<CalendarEventKind, string> = {
  live: 'Live now',
  prepared: 'Prepared',
  completed: 'Completed',
  invalid: 'Invalid',
}

/** Legend entries in prototype order. */
export const LEGEND: [CalendarEventKind, string][] = [
  ['live', 'Live'],
  ['prepared', 'Prepared'],
  ['completed', 'Completed'],
  ['invalid', 'Invalid'],
]

/** The 6 px swatch (.cal-key) colour per state; always shown beside text. */
export const KIND_SWATCH: Record<CalendarEventKind, string> = {
  live: 'bg-accent',
  prepared: 'bg-warn',
  completed: 'bg-fg2',
  invalid: 'bg-error',
}

export const KIND_EDGE: Record<CalendarEventKind, string> = {
  live: 'border-l-accent',
  prepared: 'border-l-warn',
  completed: 'border-l-fg2',
  invalid: 'border-l-error',
}

export const KIND_CHIP: Record<CalendarEventKind, 'accent' | 'warn' | 'neutral' | 'error'> = {
  live: 'accent',
  prepared: 'warn',
  completed: 'neutral',
  invalid: 'error',
}

/** "N sessions" / "1 session" */
export function sessionsLabel(n: number): string {
  return `${n} session${n === 1 ? '' : 's'}`
}

export { DAY }
