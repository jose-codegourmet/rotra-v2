'use client'

import type { SessionCourt } from '@rotra/data/queue-session/types'
import { Button } from '@rotra/ui/button'
import { formatTime } from '@rotra/ui/now-card/helpers'
import { Sheet } from '@rotra/ui/sheet'

export type ExtendMinutes = 30 | 60

export type CourtsAndTimeSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The session's courts (not removed), in order; only their labels are shown */
  courts: Pick<SessionCourt, 'id' | 'label'>[]
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
  endsAt,
  onAddCourt,
  onExtend,
  isPending = false,
}: CourtsAndTimeSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Courts and time"
      footer={<Button onClick={() => onOpenChange(false)}>Done</Button>}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-fg2">Courts</span>
        <p className="m-0 text-[13px]">{courts.map((c) => c.label).join(', ')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onAddCourt}>
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
