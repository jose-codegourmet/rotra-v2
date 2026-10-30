/** The prototype's ago(): just now, 12 min ago, 19 hours ago, 3 days ago. */
export function requestAgo(at: Date | string, now: Date = new Date()): string {
  const m = Math.round((now.getTime() - new Date(at).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}
