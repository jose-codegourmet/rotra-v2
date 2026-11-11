'use client'

import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { formatSessionDay } from '@rotra/ui/date-block'
import { Icon } from '@rotra/ui/icon'
import {
  type CalendarEvent,
  type CalendarEventKind,
  SessionCalendar,
} from '@rotra/ui/session-calendar'
import { dayKey, formatMonthTitle, formatTime } from '@rotra/ui/session-calendar/helpers'

export type ClubCalendarSession = {
  id: string
  title: string
  startsAt: number
  endsAt: number
  status: 'live' | 'scheduled' | 'done'
  /** The public session page; null for a done session whose page is gone (after three months) */
  href: string | null
}

export type ClubCalendarProps = {
  /** Every session of the club, upcoming and done (never cancelled) */
  sessions: ClubCalendarSession[]
  /** Any day of the month shown */
  referenceDate: number
  today: number
  /** The tapped date whose sessions list under the grid, or null */
  selectedDate: number | null
  /** False at the oldest session's month / the last upcoming session's month */
  canMovePrevious: boolean
  canMoveNext: boolean
  onMove: (direction: -1 | 1) => void
  /** Back to this month, today selected */
  onToday: () => void
  /** A date was tapped (null: the selected date was tapped again) */
  onSelectDay: (date: number | null) => void
}

const KIND: Record<ClubCalendarSession['status'], CalendarEventKind> = {
  live: 'live',
  scheduled: 'prepared',
  done: 'completed',
}
const LABELS: Partial<Record<CalendarEventKind, string>> = {
  live: 'Happening now',
  prepared: 'Scheduled',
  completed: 'Done',
}
const LEGEND: [CalendarEventKind, string][] = [
  ['live', 'Happening now'],
  ['prepared', 'Scheduled'],
  ['completed', 'Done'],
]
const EDGE: Record<ClubCalendarSession['status'], string> = {
  live: 'border-l-accent',
  scheduled: 'border-l-warn',
  done: 'border-l-fg3',
}

function DayCard({ session }: { session: ClubCalendarSession }) {
  const card = cn(
    'flex w-full min-w-0 flex-col items-start gap-[3px] rounded-md border border-border border-l-[3px] bg-surface px-2.5 py-2 text-left text-fg no-underline [&+&]:mt-1.5',
    EDGE[session.status],
  )
  const time = (
    <span className="text-xs font-bold text-fg2">{formatSessionDay(session.startsAt)}</span>
  )
  if (session.status === 'done')
    return (
      <div className={card}>
        {time}
        <b className="max-w-full [overflow-wrap:anywhere]">{session.title}</b>
        {session.href ? (
          <Button size="xs" variant="ghost" asChild>
            <a href={session.href}>
              Session page <Icon name="external" />
            </a>
          </Button>
        ) : (
          <span className="text-sm text-fg2">Session page no longer available</span>
        )}
        <Chip>Done</Chip>
      </div>
    )
  return (
    <a
      href={session.href ?? undefined}
      className={cn(card, 'hover:border-border-strong hover:bg-elev')}
    >
      <span className="text-xs font-bold text-fg2">
        {formatSessionDay(session.startsAt)} · {formatTime(session.startsAt)}–
        {formatTime(session.endsAt)}
      </span>
      <b className="max-w-full [overflow-wrap:anywhere]">{session.title}</b>
      <Chip tone={session.status === 'live' ? 'accent' : 'warn'}>
        {session.status === 'live' ? 'Happening now' : 'Scheduled'}
      </Chip>
    </a>
  )
}

/**
 * P-CLUB-PAGE › Calendar: the Queue dashboard's month view (SessionCalendar, month only) with the
 * club's complete schedule, dots on phones, and the tapped date's sessions listed under the grid.
 */
export function ClubCalendar({
  sessions,
  referenceDate,
  today,
  selectedDate,
  canMovePrevious,
  canMoveNext,
  onMove,
  onToday,
  onSelectDay,
}: ClubCalendarProps) {
  const events: CalendarEvent[] = sessions.map((s) => ({
    sessionId: s.id,
    title: s.title,
    venueName: '',
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    kind: KIND[s.status],
  }))
  const toggle = (at: number) =>
    onSelectDay(selectedDate !== null && dayKey(selectedDate) === dayKey(at) ? null : at)
  const ref = new Date(referenceDate)
  const inMonth = sessions.some((s) => {
    const d = new Date(s.startsAt)
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
  })
  const dayList =
    selectedDate !== null
      ? sessions
          .filter((s) => dayKey(s.startsAt) === dayKey(selectedDate))
          .sort((a, b) => a.startsAt - b.startsAt)
      : []
  return (
    <SessionCalendar
      view="month"
      events={events}
      referenceDate={referenceDate}
      today={today}
      selectedDate={selectedDate ?? undefined}
      dayOpens="select"
      phoneDots
      kindLabels={LABELS}
      legend={LEGEND}
      canMovePrevious={canMovePrevious}
      canMoveNext={canMoveNext}
      onMove={(direction) => onMove(direction)}
      onToday={onToday}
      onOpenDay={toggle}
      onOpenSession={(id) => {
        const session = sessions.find((s) => s.id === id)
        if (session) toggle(session.startsAt)
      }}
    >
      {selectedDate !== null ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
            {new Date(selectedDate).toLocaleDateString([], {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          {dayList.length ? (
            <div>
              {dayList.map((session) => (
                <DayCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="px-3 py-6 text-center text-sm text-fg2">No sessions this day.</div>
          )}
        </div>
      ) : inMonth ? null : (
        <p className="m-0 text-sm text-fg2">No sessions in {formatMonthTitle(referenceDate)}.</p>
      )}
      <span className="text-xs text-fg2">
        Every session of this club, upcoming and done. Done sessions keep their session page for
        three months.
      </span>
    </SessionCalendar>
  )
}
