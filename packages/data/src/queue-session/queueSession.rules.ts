import { MAX_SESSION_MS, sessionWindowError } from '@rotra/schema/court-window'
import type { SessionPlayer, SessionWaitlistEntry } from '../session-roster/sessionRoster.types'
import type { QueueSession, QueueSessionInput, SessionCourt } from './queueSession.types'
/** The prototype's sessionLink(): the id stripped of non-alphanumerics, last 6 characters, lowercase. */
export function publicSlugFor(sessionId: string) {
  return sessionId
    .replace(/[^a-z0-9]/gi, '')
    .slice(-6)
    .toLowerCase()
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
/** Invalid and cancelled sessions never take part in venue or time clashes. */
export function countsForClash(session: Pick<QueueSession, 'state'>) {
  return session.state !== 'invalid' && session.state !== 'cancelled'
}
/** Cancel session's optional reason: trimmed, empty means none, at most this many characters. */
export const CANCEL_REASON_MAX = 120
export function cancelReasonOf(reason: string | null | undefined) {
  return reason?.trim() || null
}
export function cancelReasonError(reason: string | null | undefined) {
  return (cancelReasonOf(reason)?.length ?? 0) > CANCEL_REASON_MAX
    ? `Keep the reason to ${CANCEL_REASON_MAX} characters.`
    : null
}
/**
 * Cancel session runs only on a prepared session (before Start session). An already-cancelled
 * session is not a blocker: a retried cancel returns it unchanged.
 */
export function cancelBlocker(session: Pick<QueueSession, 'state'>) {
  return session.state === 'prepared' || session.state === 'cancelled'
    ? null
    : 'Only a session that has not started can be cancelled.'
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
          countsForClash(s) &&
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
// ---------- Times and days: Set end time (T2) and a late or other-day start (T3) ----------

/** Club display and entry zone for v1 (T6); `@rotra/ui`'s now-card helpers use the same zone. */
const CLUB_TIME_ZONE = 'Asia/Manila'
const CLUB_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLUB_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const CLUB_TIME = new Intl.DateTimeFormat('en-US', {
  timeZone: CLUB_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})
const CLUB_DATE = new Intl.DateTimeFormat('en-US', {
  timeZone: CLUB_TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})
const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) =>
  parts.find((entry) => entry.type === type)?.value ?? ''
const clubDayUtc = (at: number) => Date.parse(`${CLUB_DAY.format(new Date(at))}T00:00:00Z`)

/** Whole club-zone days from `from` to `to` (yesterday −1, today 0, tomorrow 1). */
export function clubDayDiff(from: number, to: number) {
  return Math.round((clubDayUtc(to) - clubDayUtc(from)) / 864e5)
}
/** "9:30 PM" in the club zone. */
export function clubTimeLabel(at: number) {
  const parts = CLUB_TIME.formatToParts(new Date(at))
  return `${part(parts, 'hour')}:${part(parts, 'minute')} ${part(parts, 'dayPeriod')}`
}
/** Mid-sentence time with its day (T4): "9:30 PM", "tomorrow 1:00 AM", "Sat, Nov 1 · 9:00 PM". */
export function whenLabel(at: number, now: number) {
  const days = clubDayDiff(now, at)
  if (days === 0) return clubTimeLabel(at)
  if (days === 1 || days === -1)
    return `${days < 0 ? 'yesterday' : 'tomorrow'} ${clubTimeLabel(at)}`
  const parts = CLUB_DATE.formatToParts(new Date(at))
  return `${part(parts, 'weekday')}, ${part(parts, 'month')} ${part(parts, 'day')} · ${clubTimeLabel(at)}`
}
/** The prototype's atWhen(): "at 9:30 PM" today, otherwise `whenLabel`. */
export function atWhenLabel(at: number, now: number) {
  return clubDayDiff(now, at) === 0 ? `at ${clubTimeLabel(at)}` : whenLabel(at, now)
}

export const END_AFTER_NOW_ERROR = 'Choose an end time after now.'
export const END_WITHIN_DAY_ERROR = 'Choose an end at most 24 hours after play began.'
export const START_NEEDS_NEW_END = 'Set a new end time after now to start.'

/**
 * T3: starting after the planned end, or on another club day than the planned start, needs a new
 * end first (the prototype's startNeedsEnd(); the same rule as StartSessionSheet's startNeedsNewEnd).
 */
export function startNeedsNewEnd(plannedStartAt: number, plannedEndAt: number, now: number) {
  return now > plannedEndAt || clubDayDiff(plannedStartAt, now) !== 0
}

type EndCourt = Pick<SessionCourt, 'label' | 'startsAt' | 'openUntil' | 'removedAt'>

/**
 * Courts that follow the session end (`openUntil` null) move with it. A court that opens at or
 * after the new end, or has its own booking past it, blocks the change until that court is edited.
 * `courtBase` is the start courts without their own planned start count from.
 */
export function sessionEndCourtConflict(
  courts: EndCourt[],
  endAt: number,
  courtBase: number,
  now: number,
) {
  const live = courts.filter((c) => !c.removedAt)
  const opens = live.find((c) => (c.startsAt ?? courtBase) >= endAt)
  if (opens)
    return `${opens.label} opens ${atWhenLabel(opens.startsAt ?? courtBase, now)}. Pick a later end, or edit that court first.`
  const booked = live.find((c) => c.openUntil != null && c.openUntil > endAt)
  if (booked?.openUntil != null)
    return `${booked.label} is booked until ${whenLabel(booked.openUntil, now)}. Pick a later end, or edit that court first.`
  return null
}

/**
 * Set end time (T2). Live: any time after now, later or earlier, at most 24 hours after the actual
 * start (which never moves). Prepared: the setup window (after the start, at most 24 hours later).
 * Then the court conflicts. Extend 30 / 60 run the same rule on end + minutes.
 */
export function sessionEndError(input: {
  startedAt: number | null
  scheduledStartAt: number
  endAt: number
  now: number
  courts: EndCourt[]
}) {
  const { startedAt, scheduledStartAt, endAt, now } = input
  if (!Number.isFinite(endAt)) return 'Enter a date and time.'
  if (startedAt != null) {
    if (endAt <= now) return END_AFTER_NOW_ERROR
    if (endAt - startedAt > MAX_SESSION_MS) return END_WITHIN_DAY_ERROR
  } else {
    const error = sessionWindowError(scheduledStartAt, endAt)
    if (error) return error
  }
  return sessionEndCourtConflict(input.courts, endAt, startedAt ?? scheduledStartAt, now)
}

/**
 * Start session's new end (T3): required when `startNeedsNewEnd`, then after now and at most 24
 * hours later (play begins now). Null when no new end is needed or the given one is valid.
 */
export function startNewEndError(input: {
  scheduledStartAt: number
  scheduledEndAt: number
  newEndAt: number | null | undefined
  now: number
}) {
  const { newEndAt, now } = input
  if (!startNeedsNewEnd(input.scheduledStartAt, input.scheduledEndAt, now)) return null
  if (newEndAt == null || !Number.isFinite(newEndAt)) return START_NEEDS_NEW_END
  if (newEndAt <= now) return END_AFTER_NOW_ERROR
  if (newEndAt - now > MAX_SESSION_MS) return END_WITHIN_DAY_ERROR
  return null
}

/**
 * Why Start session is refused, or null. With `now` (the command, not the Start bar) it also
 * requires a valid new end for a late or other-day start (T3); the bar leaves it out because
 * Start session's sheet asks for that end.
 */
export function startBlocker(
  session: QueueSession,
  ctx: {
    sessions: QueueSession[]
    roster: SessionPlayer[]
    licenseExpired: boolean
    offline: boolean
    downloaded: boolean
    now?: number
    newEndAt?: number | null
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
  if (missing)
    return `${missing} player${missing === 1 ? ' needs' : 's need'} a level before you can start.`
  return ctx.now === undefined
    ? null
    : startNewEndError({
        scheduledStartAt: session.scheduledStartAt,
        scheduledEndAt: session.scheduledEndAt,
        newEndAt: ctx.newEndAt,
        now: ctx.now,
      })
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
