'use client'

import type { SessionCourt } from '@rotra/data/queue-session/types'
import { courtNextDay } from '@rotra/schema/court-window'
import { Button } from '@rotra/ui/button'
import { Notice } from '@rotra/ui/notice'
import { formatTime } from '@rotra/ui/now-card/helpers'
import { Sheet } from '@rotra/ui/sheet'

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
  startsAt?: number
  onEditCourt?: (courtId: string) => void
  onRemoveCourt?: (courtId: string) => void
  serverError?: string
  /** The session's scheduled end, shown as "Ends at HH:MM" */
  endsAt: number
  /** "Add a court…": the container opens the Add court sheet (Q-ADD-COURT) */
  onAddCourt: () => void
  /** "Extend 30 min" / "Extend 60 min" */
  onExtend: (minutes: ExtendMinutes) => void
  /** An extension is running: both Extend buttons are disabled so one tap cannot extend twice */
  isPending?: boolean
}

const EXTEND_OPTIONS: ExtendMinutes[] = [30, 60]

/**
 * Q-SESSION-ADJUST › Courts and time: the session's court labels with "Add a court…", the end time
 * with Extend 30 min / Extend 60 min, and the note that nothing running is changed here.
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
}: CourtsAndTimeSheetProps) {
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
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-fg2">Ends at {formatTime(endsAt)}</span>
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
      <p className="m-0 text-[13px] text-fg2">
        Occupied courts can't be removed, and running matches aren't changed here. Changing mode,
        formats or the minimum during play hasn't been decided.
      </p>
    </Sheet>
  )
}
