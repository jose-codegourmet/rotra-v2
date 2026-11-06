'use client'

import type { SessionCourt } from '@rotra/data/queue-session/types'
import { courtNextDay } from '@rotra/schema/court-window'
import { Button } from '@rotra/ui/button'
import { DateTimePicker } from '@rotra/ui/date-time-picker'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { formatTime, formatWhen } from '@rotra/ui/now-card/helpers'
import { sessionEndStatus } from '@rotra/ui/overdue-banner'
import { Sheet } from '@rotra/ui/sheet'
import { ceilToQuarterHour } from '@rotra/ui/start-session-sheet/helpers'
import { useEffect, useRef, useState } from 'react'

export type ExtendMinutes = 30 | 60

export type CourtsAndTimeSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The session's courts (not removed), in order, with booking windows and edit/removal guards. */
  courts: (Pick<SessionCourt, 'id' | 'label'> & {
    startsAt?: number
    openUntil?: number | null
    occupied?: boolean
    used?: boolean
  })[]
  /** When play began; the New end may be up to 24 h after it, and "· next day" counts from it */
  startsAt?: number
  onEditCourt?: (courtId: string) => void
  onRemoveCourt?: (courtId: string) => void
  serverError?: string
  /** The session's planned end, shown as "Ends 9:00 PM" with its day */
  endsAt: number
  /** The current time; stories pass a fixed one so the overdue text stays stable */
  now?: number
  /**
   * "Set end time" with the chosen New end (any time after now, later or earlier, up to 24 h after
   * play began). Without it the New end picker is not shown and only Extend 30 / 60 remain.
   */
  onSetEndTime?: (endAt: number) => void
  /** Called when the New end choice changes, e.g. so the container can clear endTimeError */
  onNewEndChange?: (endAt: number | null) => void
  /**
   * Why the end could not be set, shown under New end: "Court 3 opens 9:30 PM. Pick a later end, or
   * edit that court first." / "Court 2 is booked until 10:00 PM. Pick a later end, or edit that court
   * first." ("Choose an end time after now." is checked here.)
   */
  endTimeError?: string
  /** Opened from the overdue banner's Set end time: focus the New end picker */
  focusEnd?: boolean
  /** "Add a court…": the container opens the Add court sheet (Q-ADD-COURT) */
  onAddCourt: () => void
  /** "Extend 30 min" / "Extend 60 min" */
  onExtend: (minutes: ExtendMinutes) => void
  /** An extension is running: both Extend buttons are disabled so one tap cannot extend twice */
  isPending?: boolean
}

const EXTEND_OPTIONS: ExtendMinutes[] = [30, 60]
const DAY = 86_400_000
const END_AFTER_NOW = 'Choose an end time after now.'

/** The New end pre-fill: the current end while it is ahead, else the next 15-minute step after now. */
function newEndPrefill(endsAt: number, now: number): number {
  return endsAt > now ? endsAt : ceilToQuarterHour(now + 1)
}

/**
 * Q-SESSION-ADJUST › Courts and time: the session's court labels with "Add a court…", the end time
 * with a New end picker, Set end time and the Extend 30 min / Extend 60 min shortcuts, and the notes
 * that the start is fixed and nothing running is changed here.
 */
export function CourtsAndTimeSheet({
  open,
  onOpenChange,
  courts,
  startsAt,
  onEditCourt,
  onRemoveCourt,
  serverError,
  endsAt,
  onAddCourt,
  onExtend,
  isPending = false,
  now: nowProp,
  onSetEndTime,
  onNewEndChange,
  endTimeError,
  focusEnd,
}: CourtsAndTimeSheetProps) {
  const now = nowProp ?? Date.now()
  const endStatus = sessionEndStatus(endsAt, now)
  const maxEnd = (startsAt ?? now) + DAY
  const [newEndAt, setNewEndAt] = useState<number | null>(() => newEndPrefill(endsAt, now))
  const [localError, setLocalError] = useState<string>()
  const timeRef = useRef<HTMLSelectElement>(null)

  // Each opening, and each end change (Extend), starts from the current end.
  // biome-ignore lint/correctness/useExhaustiveDependencies: open and endsAt are the triggers, not now
  useEffect(() => {
    if (!open) return
    setNewEndAt(newEndPrefill(endsAt, now))
    setLocalError(undefined)
  }, [open, endsAt])

  // Opened from the overdue banner: the Sheet focuses its title on open, so wait a frame, then move
  // to the New end time list, as the prototype's autofocus does.
  useEffect(() => {
    if (!open || !focusEnd) return
    const id = requestAnimationFrame(() => timeRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open, focusEnd])

  const changeNewEnd = (next: number | null) => {
    setNewEndAt(next)
    setLocalError(undefined)
    onNewEndChange?.(next)
  }

  const setEndTime = () => {
    if (!onSetEndTime) return
    if (newEndAt === null || !(newEndAt > (nowProp ?? Date.now()))) {
      setLocalError(END_AFTER_NOW)
      return
    }
    onSetEndTime(newEndAt)
  }

  const endError = localError ?? endTimeError

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      dismissible={!isPending}
      title="Courts and time"
      footer={
        <Button disabled={isPending} onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      {serverError ? <Notice tone="error">{serverError}</Notice> : null}
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-fg2">Courts</span>
        {courts.map((court) => (
          <div
            key={court.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2"
          >
            <div>
              <b>{court.label}</b>
              <p className="text-[13px] text-fg2">
                {court.startsAt !== undefined
                  ? `${formatTime(court.startsAt)}${startsAt !== undefined && courtNextDay(court.startsAt, startsAt) ? ' · next day' : ''} – `
                  : ''}
                {formatTime(court.openUntil ?? endsAt)}
                {startsAt !== undefined && courtNextDay(court.openUntil ?? endsAt, startsAt)
                  ? ' · next day'
                  : ''}
                {court.used ? ' · start fixed after use' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              {onEditCourt ? (
                <Button size="sm" disabled={isPending} onClick={() => onEditCourt(court.id)}>
                  Edit {court.label}
                </Button>
              ) : null}
              {onRemoveCourt ? (
                <Button
                  size="sm"
                  disabled={isPending || court.occupied || courts.length === 1}
                  title={
                    court.occupied
                      ? 'Only a free court can be removed'
                      : courts.length === 1
                        ? 'A session needs at least one court'
                        : undefined
                  }
                  onClick={() => onRemoveCourt(court.id)}
                >
                  Remove {court.label}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={isPending} onClick={onAddCourt}>
          Add a court…
        </Button>
      </div>
      {onSetEndTime ? (
        <div className="flex min-w-0 flex-col gap-1.5">
          <Field
            label={
              <>
                Ends {formatWhen(endsAt, now, { lower: true })}
                {endStatus.over ? <span className="text-warn"> · {endStatus.text}</span> : null}
              </>
            }
            error={endError}
          >
            <DateTimePicker
              ref={timeRef}
              label="New end"
              value={newEndAt}
              onChange={changeNewEnd}
              days={[now, maxEnd]}
              base={startsAt ?? now}
              min={now + 1}
              max={maxEnd}
              disabled={isPending}
              invalid={Boolean(endError)}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={isPending || newEndAt === null || !(newEndAt > now)}
              aria-busy={isPending || undefined}
              onClick={setEndTime}
            >
              Set end time
            </Button>
            {EXTEND_OPTIONS.map((minutes) => (
              <Button
                key={minutes}
                size="sm"
                disabled={isPending}
                aria-busy={isPending || undefined}
                onClick={() => onExtend(minutes)}
              >
                Extend {minutes} min
              </Button>
            ))}
          </div>
          <span className="text-xs font-normal text-fg2">
            The public page shows the new end time after it syncs.
          </span>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-fg2">
            Ends {formatWhen(endsAt, now, { lower: true })}
            {endStatus.over ? <span className="text-warn"> · {endStatus.text}</span> : null}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {EXTEND_OPTIONS.map((minutes) => (
              <Button
                key={minutes}
                size="sm"
                disabled={isPending}
                aria-busy={isPending || undefined}
                onClick={() => onExtend(minutes)}
              >
                Extend {minutes} min
              </Button>
            ))}
          </div>
          <span className="text-xs font-normal text-fg2">
            The public page shows the new end time after it syncs.
          </span>
        </div>
      )}
      <p className="m-0 text-[13px] text-fg2">Start time is fixed: it records when play began.</p>
      <p className="m-0 text-[13px] text-fg2">
        Occupied courts can't be removed, and running matches aren't changed here. Changing mode,
        formats or the minimum during play hasn't been decided.
      </p>
    </Sheet>
  )
}
