/** "2026-10-27" for a local day, the form setup reads from ?date= */
export function toDateParam(at: number): string {
  const d = new Date(at)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** "Sunday, October 25" */
export function longDayLabel(at: number): string {
  return new Date(at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

/** "Oct 3" this year, "Oct 3, 2025" otherwise, like the prototype's fmtShortDate */
export function shortDateLabel(at: number, now = Date.now()): string {
  const d = new Date(at)
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric',
  })
}

/** "October 3, 2026" */
export function longDateLabel(at: number): string {
  return new Date(at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
}

/** Where a session opens from the dashboard and calendar, by its state */
export function sessionHref(session: { id: string; state: string }): string {
  if (session.state === 'active') return `/sessions/${session.id}`
  if (session.state === 'finalizing') return `/sessions/${session.id}/finishing`
  if (session.state === 'prepared') return `/sessions/${session.id}/preparation`
  return `/sessions/${session.id}/record`
}
