'use client'

import { Button } from '@rotra/ui/button'
import { DateCalendar } from '@rotra/ui/date-picker/date-calendar'
import { formatLongDate, todayYmd } from '@rotra/ui/date-picker/date-calendar/helpers'
import { Sheet } from '@rotra/ui/sheet'
import { useEffect, useState } from 'react'

export type ChooseDateSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "YYYY-MM-DD" */
  value: string
  /** Set date applies the chosen day; Cancel and Escape leave the value unchanged */
  onApply: (ymd: string) => void
  /** Days the club already has a session (dot + legend) */
  markedDates?: string[]
  /** A past date already saved on the session stays selectable */
  allowedPastDate?: string
}

/**
 * Choose a date: the single-date picker dialog used by session setup, built on the Foundation
 * DateCalendar inside a Sheet (a bottom sheet on phones).
 */
export function ChooseDateSheet({
  open,
  onOpenChange,
  value,
  onApply,
  markedDates,
  allowedPastDate,
}: ChooseDateSheetProps) {
  const today = todayYmd()
  const [draft, setDraft] = useState(value)
  useEffect(() => {
    if (open) setDraft(value)
  }, [open, value])
  const min = allowedPastDate && allowedPastDate < today ? allowedPastDate : today
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Choose a date"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => onApply(draft)} disabled={!draft}>
            Set date
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-0.5 rounded-lg border border-accent/45 bg-accent-subtle px-4 py-3.5">
        <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
          Session date
        </span>
        <b className="text-xl font-extrabold tracking-[-0.3px]">
          {draft ? formatLongDate(draft) : 'No date yet'}
        </b>
        {draft === today ? <span className="text-[13px] text-fg2">Today</span> : null}
      </div>
      <DateCalendar
        value={draft}
        onChange={setDraft}
        min={min}
        markedDates={markedDates}
        markedLabel="your club has a session"
      />
      <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-fg2">
        <span className="inline-flex items-center gap-1">
          <i aria-hidden className="inline-block size-1.5 rounded-full bg-warn" />
          Your club already has a session
        </span>
        <Button size="xs" onClick={() => setDraft(today)}>
          Today
        </Button>
      </div>
      <p className="m-0 text-[13px] text-fg2">Use the arrow keys to move between days.</p>
    </Sheet>
  )
}
