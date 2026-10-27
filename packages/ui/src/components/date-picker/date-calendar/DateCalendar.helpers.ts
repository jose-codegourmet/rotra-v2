// Dates travel as "YYYY-MM-DD" strings (the session draft's format); the grid works in local dates.

export const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const

/** "2026-10-27" → local midnight Date; undefined for an empty or malformed value */
export function fromYmd(ymd: string | undefined): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd ?? '')
  if (!match) return undefined
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** Local Date → "YYYY-MM-DD" */
export function toYmd(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

export function todayYmd(): string {
  return toYmd(new Date())
}

/** "Tuesday, October 27, 2026", as the prototype's fmtLongDate shows it */
export function formatLongDate(ymd: string): string {
  const date = fromYmd(ymd)
  return date
    ? date.toLocaleDateString('en', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : ''
}

export function formatMonth(date: Date): string {
  return date.toLocaleDateString('en', { month: 'long', year: 'numeric' })
}
