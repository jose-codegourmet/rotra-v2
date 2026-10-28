import type { SessionPlayer, SessionWaitlistEntry } from '../session-roster/sessionRoster.types'
import type { QueueSession, QueueSessionInput } from './queueSession.types'
/** The prototype's sessionLink(): the id stripped of non-alphanumerics, last 6 characters, lowercase. */
export function publicSlugFor(sessionId: string) {
  return sessionId.replace(/[^a-z0-9]/gi, '').slice(-6).toLowerCase()
}
export function sessionMinutes(start: number, end: number) {
  return ((end > start ? end : end + 86400000) - start) / 60000
}
export function slotCapacity(courts: number, playersPerCourt: number) {
  return courts * playersPerCourt
}
export function openSlots(capacity: number, rosterCount: number) {
  return Math.max(0, capacity - rosterCount)
}
export function playersPerGame(singles: boolean, doubles: boolean) {
  return singles && doubles ? 10 / 3 : doubles ? 4 : 2
}
export function estimateMinimum(input: {
  courts: number
  minutes: number
  players: number
  allowSingles: boolean
  allowDoubles: boolean
}) {
  const n = Math.max(1, input.players),
    per = playersPerGame(input.allowSingles, input.allowDoubles),
    usable = Math.max(1, Math.min(input.courts, Math.floor(n / per)))
  return {
    low: Math.floor((usable * Math.floor(input.minutes / 20) * per) / n),
    high: Math.floor((usable * Math.floor(input.minutes / 15) * per) / n),
    usable,
  }
}
export const timeLabel = (at: number) =>
  new Date(at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
export function sessionOccurrences(
  draft: Pick<
    QueueSessionInput,
    'scheduledStartAt' | 'scheduledEndAt' | 'venueId' | 'repeat' | 'occurrences'
  > & { id?: string },
  others: QueueSession[],
) {
  const n =
    draft.repeat && draft.repeat !== 'none' ? Math.max(2, Math.min(12, draft.occurrences || 4)) : 1
  return Array.from({ length: n }, (_, i) => {
    const date = new Date(draft.scheduledStartAt)
    if (draft.repeat === 'weekly' || draft.repeat === 'biweekly')
      date.setDate(date.getDate() + i * (draft.repeat === 'weekly' ? 7 : 14))
    if (draft.repeat === 'monthly') {
      const day = date.getDate()
      date.setDate(1)
      date.setMonth(date.getMonth() + i)
      date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()))
    }
    const start = date.getTime(),
      end = start + sessionMinutes(draft.scheduledStartAt, draft.scheduledEndAt) * 60000
    const other = others
      .filter(
        (s) =>
          s.id !== draft.id &&
          s.state !== 'invalid' &&
          s.scheduledStartAt < end &&
          start < s.scheduledEndAt,
      )
      .sort((a, b) => Number(b.venueId === draft.venueId) - Number(a.venueId === draft.venueId))[0]
    const venue = other?.venueId === draft.venueId
    return {
      start,
      end,
      clash: other
        ? {
            kind: venue ? ('venue' as const) : ('time' as const),
            sessionId: other.id,
            text: venue
              ? `Venue clash: ${other.venueName} is already booked for ${other.title}, ${timeLabel(other.scheduledStartAt)}–${timeLabel(other.scheduledEndAt)}`
              : `Time clash: ${other.title} runs ${timeLabel(other.scheduledStartAt)}–${timeLabel(other.scheduledEndAt)} at ${other.venueName}`,
          }
        : null,
    }
  })
}
export function startBlocker(
  session: QueueSession,
  ctx: {
    sessions: QueueSession[]
    roster: SessionPlayer[]
    licenseExpired: boolean
    offline: boolean
    downloaded: boolean
  },
) {
  const active = ctx.sessions.find(
    (s) => s.clubId === session.clubId && s.id !== session.id && s.state === 'active',
  )
  if (active) return `${active.title} is already running. One session at a time.`
  if (ctx.licenseExpired) return 'Your license has ended, so new sessions can’t start.'
  if (ctx.offline && !ctx.downloaded)
    return 'No downloaded copy on this device. Connect, or download first.'
  const missing = ctx.roster.filter((p) => !p.level).length
  return missing
    ? `${missing} player${missing === 1 ? ' needs' : 's need'} a level before you can start.`
    : null
}
/** Returns the FCFS partition; callers materialize promoted roster snapshots. */
export function rebalanceSlots(
  roster: SessionPlayer[],
  waitlist: SessionWaitlistEntry[],
  capacity: number,
) {
  const ordered = [...roster].sort((a, b) => a.confirmedAt - b.confirmedAt),
    kept = ordered.slice(0, capacity),
    movedOut = ordered.slice(capacity)
  const waiting = [...waitlist].sort((a, b) => a.addedAt - b.addedAt),
    movedIn = waiting.slice(0, Math.max(0, capacity - kept.length))
  return { kept, movedOut, movedIn, waiting: waiting.slice(movedIn.length) }
}
