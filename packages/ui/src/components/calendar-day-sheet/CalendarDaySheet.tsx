'use client'

import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import {
  type CalendarEvent,
  formatDayTitle,
  formatTime,
  isTodayOrLater,
  KIND_CHIP,
  KIND_LABEL,
  KIND_SWATCH,
  sameDay,
  sessionsLabel,
} from '@rotra/ui/session-calendar/helpers'
import { Sheet } from '@rotra/ui/sheet'

export type CalendarDaySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The tapped date */
  date: number
  today: number
  /** That day's sessions, in start order */
  events: CalendarEvent[]
  onOpenSession: (sessionId: string) => void
  /** Opens setup with the date filled in; offered for today or later only */
  onCreateOnDay: (date: number) => void
}

/**
 * The dashboard's day dialog (a bottom sheet on phones): the full date, that day's sessions with a
 * state chip, Close, and Create session today / on this day for today or later.
 */
export function CalendarDaySheet({
  open,
  onOpenChange,
  date,
  today,
  events,
  onOpenSession,
  onCreateOnDay,
}: CalendarDaySheetProps) {
  const isToday = sameDay(date, today)
  const canCreate = isTodayOrLater(date, today)
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${formatDayTitle(date)}${isToday ? ' · Today' : ''}`}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
          {canCreate ? (
            <Button variant="primary" onClick={() => onCreateOnDay(date)}>
              Create session{isToday ? ' today' : ' on this day'}
            </Button>
          ) : null}
        </>
      }
    >
      {events.length ? (
        <>
          <p className="m-0 text-[13px] text-fg2">{sessionsLabel(events.length)} this day.</p>
          <div className="flex flex-col gap-1.5">
            {events.map((event) => (
              <button
                key={event.sessionId}
                type="button"
                onClick={() => onOpenSession(event.sessionId)}
                className={cn(
                  'flex w-full min-w-0 items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-fg',
                  'hover:border-border-strong hover:bg-elev',
                )}
              >
                <i
                  aria-hidden
                  className={cn('size-1.5 flex-none rounded-full', KIND_SWATCH[event.kind])}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="[overflow-wrap:anywhere]">{event.title}</b>
                  <span className="text-[13px] text-fg2">
                    {formatTime(event.startsAt)} · {event.venueName}
                  </span>
                </span>
                <Chip tone={KIND_CHIP[event.kind]}>{KIND_LABEL[event.kind]}</Chip>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="px-3 py-6 text-center text-sm text-fg2">No sessions this day.</div>
      )}
    </Sheet>
  )
}
