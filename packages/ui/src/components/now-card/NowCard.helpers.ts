const MINUTE = 60_000

/** "6:00 PM" in the viewer's locale, like the prototype's fmtTime. */
export function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** "Sun, Oct 25", like the prototype's fmtDate. */
export function formatShortDate(at: number): string {
  return new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

/** "2 h 15 min" between two times, like the prototype's fmtDur (wraps past midnight). */
export function formatDuration(from: number, to: number): string {
  let minutes = Math.round((to - from) / MINUTE)
  if (minutes <= 0) minutes += 1440
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours} h${rest ? ` ${rest} min` : ''}`
}

/**
 * The countdown on the upcoming badge, with the prototype's untilText() rules: "Starts in 45 min",
 * "Starts in 2 h 15 min", "Tomorrow, 6:00 PM", "In 3 days · Sun, Nov 1", "Starting now" (up to
 * 15 minutes after the start), "Was due 6:00 PM · not started".
 */
export function formatCountdown(startsAt: number, now: number): string {
  const minutes = Math.round((startsAt - now) / MINUTE)
  if (minutes <= 0) {
    return minutes > -15 ? 'Starting now' : `Was due ${formatTime(startsAt)} · not started`
  }
  if (minutes < 60) return `Starts in ${minutes} min`
  const startDay = new Date(startsAt).setHours(0, 0, 0, 0)
  const today = new Date(now).setHours(0, 0, 0, 0)
  const days = Math.round((startDay - today) / 864e5)
  if (days === 0) {
    return `Starts in ${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`
  }
  return days === 1
    ? `Tomorrow, ${formatTime(startsAt)}`
    : `In ${days} days · ${formatShortDate(startsAt)}`
}
