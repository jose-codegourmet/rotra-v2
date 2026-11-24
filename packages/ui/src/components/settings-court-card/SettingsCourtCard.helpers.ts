import { formatClockTime, startOfDay } from '../date-time-picker/DateTimePicker.helpers'

export const DAY_MS = 864e5

/**
 * The prototype's fmtWhen(t, { lower: true }) for a toast or a header line: "9:00 PM" on the
 * same day as `base`, "tomorrow 1:00 AM" the day after, "yesterday 11:00 PM" the day before,
 * otherwise "Sat, Nov 1 · 9:00 PM". Uses the same local clock as the time dialog.
 */
export function whenText(at: number, base: number): string {
  const time = formatClockTime(at)
  const days = Math.round((startOfDay(at) - startOfDay(base)) / DAY_MS)
  if (days === 0) return time
  if (days === 1) return `tomorrow ${time}`
  if (days === -1) return `yesterday ${time}`
  const date = new Date(at).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  return `${date} · ${time}`
}

/** The refusal for a From at or after Until (and an Until at or before From). */
export function opensBeforeClosesError(label: string): string {
  return `${label} has to open before it closes.`
}
