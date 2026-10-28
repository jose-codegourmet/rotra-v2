'use client'

import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { useMediaQuery } from '@rotra/ui/hooks/use-media-query'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import type { ReactNode } from 'react'
import {
  type CalendarEvent,
  type CalendarEventKind,
  type CalendarView,
  dayKey,
  formatDayTitle,
  formatMonthTitle,
  formatTime,
  formatWeekTitle,
  groupByDay,
  isTodayOrLater,
  KIND_CHIP,
  KIND_EDGE,
  KIND_LABEL,
  KIND_SWATCH,
  LEGEND,
  sessionsLabel,
  weekOf,
} from './SessionCalendar.helpers'

export type { CalendarEvent, CalendarEventKind, CalendarView }

export type SessionCalendarProps = {
  events: CalendarEvent[]
  /** The day the view is built around: any day of the month, week or the day itself */
  referenceDate: number
  today: number
  /** Month view: the last opened day, tinted */
  selectedDate?: number
  /** Forces a view; by default it follows the window (> 1024 px month, 641–1024 px week, ≤ 640 px day) */
  view?: CalendarView
  /** Previous (-1) or Next (1) by the current view's unit (month, week or day) */
  onMove: (direction: -1 | 1, view: CalendarView) => void
  onToday: () => void
  /** A date was tapped (month and week open the day dialog; the day strip moves the view) */
  onOpenDay: (date: number) => void
  onOpenSession: (sessionId: string) => void
  onCreateOnDay: (date: number) => void
  className?: string
}

const DAY_VIEW_QUERY = '(max-width: 640px)'
const WEEK_VIEW_QUERY = '(max-width: 1024px)'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function Swatch({ kind, className }: { kind: CalendarEventKind; className?: string }) {
  return (
    <i
      aria-hidden
      className={cn('inline-block size-1.5 rounded-full', KIND_SWATCH[kind], className)}
    />
  )
}

function EventCard({
  event,
  compact,
  onOpen,
}: {
  event: CalendarEvent
  /** Week columns: title wraps to two lines, no chip */
  compact?: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${event.title}, ${formatTime(event.startsAt)}–${formatTime(event.endsAt)}, ${event.venueName}, ${KIND_LABEL[event.kind]}`}
      className={cn(
        'flex w-full min-w-0 flex-col items-start gap-[3px] rounded-md border border-border border-l-[3px] bg-surface text-left text-fg',
        'hover:border-border-strong hover:bg-elev',
        compact ? 'px-2 py-1.5' : 'px-2.5 py-2',
        KIND_EDGE[event.kind],
      )}
    >
      <span className="text-xs font-bold text-fg2 tabular-nums">
        {formatTime(event.startsAt)}–{formatTime(event.endsAt)}
      </span>
      <b
        className={cn(
          'max-w-full',
          compact ? 'line-clamp-2 leading-[1.25]' : 'truncate whitespace-nowrap',
        )}
      >
        {event.title}
      </b>
      <span className="max-w-full truncate text-[13px] text-fg2">{event.venueName}</span>
      {compact ? null : <Chip tone={KIND_CHIP[event.kind]}>{KIND_LABEL[event.kind]}</Chip>}
    </button>
  )
}

function Header({
  title,
  unit,
  onMove,
  onToday,
}: {
  title: string
  unit: CalendarView
  onMove: SessionCalendarProps['onMove']
  onToday: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2>{title}</h2>
      <div className="flex items-center gap-1">
        <IconButton size="xs" label={`Previous ${unit}`} onClick={() => onMove(-1, unit)}>
          <Icon name="back" />
        </IconButton>
        <Button size="xs" onClick={onToday}>
          Today
        </Button>
        <IconButton size="xs" label={`Next ${unit}`} onClick={() => onMove(1, unit)}>
          <Icon name="back" className="-scale-x-100" />
        </IconButton>
      </div>
    </div>
  )
}

function Legend({ hint }: { hint: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-fg2">
      <div className="flex flex-wrap items-center gap-3">
        {LEGEND.map(([kind, label]) => (
          <span key={kind} className="inline-flex items-center gap-1">
            <Swatch kind={kind} />
            {label}
          </span>
        ))}
      </div>
      <span>{hint}</span>
    </div>
  )
}

/**
 * The dashboard calendar: a month grid on desktops, a week of day columns on tablets, and one day
 * with a week strip on phones. Every session opens from it; every date opens its day dialog.
 */
export function SessionCalendar({
  events,
  referenceDate,
  today,
  selectedDate,
  view: viewProp,
  onMove,
  onToday,
  onOpenDay,
  onOpenSession,
  onCreateOnDay,
  className,
}: SessionCalendarProps) {
  const phone = useMediaQuery(DAY_VIEW_QUERY)
  const tablet = useMediaQuery(WEEK_VIEW_QUERY)
  const view: CalendarView = viewProp ?? (phone ? 'day' : tablet ? 'week' : 'month')
  const byDay = groupByDay(events)
  const todayKey = dayKey(today)
  const sectionClass = cn(
    'flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card',
    className,
  )

  const dayName = (at: number, count: number) =>
    `${formatDayTitle(at)}${dayKey(at) === todayKey ? ', today' : ''}${count ? `, ${sessionsLabel(count)}` : ''}`

  if (view === 'week') {
    const days = weekOf(referenceDate)
    return (
      <section aria-label="Calendar, week view" className={sectionClass}>
        <Header title={formatWeekTitle(days)} unit="week" onMove={onMove} onToday={onToday} />
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((at) => {
            const list = byDay.get(dayKey(at)) ?? []
            const isToday = dayKey(at) === todayKey
            return (
              <div
                key={at}
                className={cn(
                  'flex min-h-40 min-w-0 flex-col gap-1.5 rounded-md bg-bg p-1.5',
                  isToday && 'shadow-[inset_0_0_0_2px_var(--accent)]',
                )}
              >
                <button
                  type="button"
                  onClick={() => onOpenDay(at)}
                  aria-haspopup="dialog"
                  aria-label={dayName(at, list.length)}
                  className="flex flex-col items-center border-0 bg-transparent py-1 text-[11px] font-bold text-fg2 uppercase"
                >
                  <span>{new Date(at).toLocaleDateString([], { weekday: 'short' })}</span>
                  <b className={cn('text-lg normal-case text-fg', isToday && 'text-accent')}>
                    {new Date(at).getDate()}
                  </b>
                </button>
                {list.length ? (
                  list.map((event) => (
                    <EventCard
                      key={event.sessionId}
                      event={event}
                      compact
                      onOpen={() => onOpenSession(event.sessionId)}
                    />
                  ))
                ) : (
                  <span aria-hidden className="text-center text-xs text-fg3">
                    —
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <Legend hint="Tap a day for more." />
      </section>
    )
  }

  if (view === 'day') {
    const days = weekOf(referenceDate)
    const refKey = dayKey(referenceDate)
    const list = byDay.get(refKey) ?? []
    return (
      <section aria-label="Calendar, day view" className={sectionClass}>
        <Header
          title={formatDayTitle(referenceDate)}
          unit="day"
          onMove={onMove}
          onToday={onToday}
        />
        <fieldset aria-label="This week" className="m-0 grid grid-cols-7 gap-1 border-0 p-0">
          {days.map((at) => {
            const key = dayKey(at)
            const count = (byDay.get(key) ?? []).length
            const selected = key === refKey
            const isToday = key === todayKey
            const d = new Date(at)
            return (
              <button
                key={at}
                type="button"
                onClick={() => onOpenDay(at)}
                aria-pressed={selected}
                aria-label={`${d.toLocaleDateString([], { weekday: 'long', day: 'numeric' })}${count ? `, ${sessionsLabel(count)}` : ''}`}
                className={cn(
                  'flex min-h-12 flex-col items-center gap-px rounded-md border-0 bg-transparent py-1.5 text-[11px] font-bold text-fg2',
                  selected && 'bg-accent text-on-accent',
                )}
              >
                <span>{d.toLocaleDateString([], { weekday: 'narrow' })}</span>
                <b
                  className={cn(
                    'text-base text-fg',
                    isToday && 'text-accent',
                    selected && 'text-on-accent',
                  )}
                >
                  {d.getDate()}
                </b>
                <i
                  aria-hidden
                  className={cn(
                    'size-[5px] rounded-full',
                    count > 0 && (selected ? 'bg-on-accent' : 'bg-accent'),
                  )}
                />
              </button>
            )
          })}
        </fieldset>
        <div className="flex flex-col gap-1.5">
          {list.length ? (
            list.map((event) => (
              <EventCard
                key={event.sessionId}
                event={event}
                onOpen={() => onOpenSession(event.sessionId)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center gap-2 px-3 py-6 text-center text-sm text-fg2">
              No sessions this day.
              {isTodayOrLater(referenceDate, today) ? (
                <Button size="sm" variant="primary" onClick={() => onCreateOnDay(referenceDate)}>
                  Create session on this day
                </Button>
              ) : null}
            </div>
          )}
        </div>
        <Legend hint="Use the arrows, or tap a day in the strip." />
      </section>
    )
  }

  // Month
  const ref = new Date(referenceDate)
  const first = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const selectedKey = selectedDate !== undefined ? dayKey(selectedDate) : todayKey
  const cells: ReactNode[] = []
  const blank = (key: string) => (
    <span key={key} aria-hidden className="min-h-24 border-r border-b border-border bg-bg/55" />
  )
  for (let i = 0; i < first.getDay(); i++) cells.push(blank(`lead-${i}`))
  for (let day = 1; day <= daysIn; day++) {
    const at = new Date(first.getFullYear(), first.getMonth(), day).getTime()
    const key = dayKey(at)
    const list = byDay.get(key) ?? []
    const isToday = key === todayKey
    cells.push(
      <div
        key={key}
        className={cn(
          'relative flex min-h-24 min-w-0 flex-col gap-1 border-r border-b border-border p-1.5 hover:bg-elev',
          key === selectedKey && 'bg-accent-subtle',
        )}
      >
        <button
          type="button"
          onClick={() => onOpenDay(at)}
          aria-haspopup="dialog"
          aria-label={dayName(at, list.length)}
          className={cn(
            'size-[26px] cursor-pointer self-start rounded-full border-0 bg-transparent p-0 text-[13px] font-bold text-fg tabular-nums after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-accent focus-visible:after:ring-inset',
            isToday && 'bg-accent text-on-accent',
          )}
        >
          {day}
        </button>
        <div className="flex min-w-0 flex-col gap-0.5">
          {list.slice(0, 2).map((event) => (
            <button
              key={event.sessionId}
              type="button"
              onClick={() => onOpenSession(event.sessionId)}
              title={`${event.title} · ${formatTime(event.startsAt)}`}
              aria-label={`${formatTime(event.startsAt)} ${event.title}, ${KIND_LABEL[event.kind]}`}
              className={cn(
                'relative z-10 max-w-full truncate rounded-[4px] border-0 border-l-[3px] bg-elev px-1.5 py-0.5 text-left text-[11px] font-semibold whitespace-nowrap text-fg',
                KIND_EDGE[event.kind],
                event.kind === 'live' && 'bg-accent-subtle',
              )}
            >
              {formatTime(event.startsAt)} {event.title}
            </button>
          ))}
          {list.length > 2 ? (
            <button
              type="button"
              onClick={() => onOpenDay(at)}
              aria-haspopup="dialog"
              className="relative z-10 border-0 bg-transparent px-1.5 text-left text-[11px] text-fg2"
            >
              +{list.length - 2} more
            </button>
          ) : null}
        </div>
      </div>,
    )
  }
  let trailing = 0
  while (cells.length % 7) cells.push(blank(`trail-${trailing++}`))

  return (
    <section aria-label="Calendar" className={sectionClass}>
      <Header
        title={formatMonthTitle(referenceDate)}
        unit="month"
        onMove={onMove}
        onToday={onToday}
      />
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-7 overflow-hidden rounded-md border-t border-l border-border">
          {WEEKDAYS.map((name) => (
            <span
              key={name}
              aria-hidden
              className="border-r border-b border-border px-2 py-1.5 text-[11px] font-bold tracking-[0.5px] text-fg2 uppercase"
            >
              {name}
            </span>
          ))}
          {cells}
        </div>
        <Legend hint="Tap a date to see its sessions." />
      </div>
    </section>
  )
}
