'use client'

import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import {
  addDays,
  addMonths,
  formatLongDate,
  formatMonth,
  fromYmd,
  startOfMonth,
  todayYmd,
  toYmd,
  WEEKDAYS,
} from './DateCalendar.helpers'

export type DateCalendarProps = {
  /** Selected day as "YYYY-MM-DD" */
  value?: string
  onChange: (ymd: string) => void
  /** Days before this "YYYY-MM-DD" are disabled (session setup passes today) */
  min?: string
  /** Days that get a dot, e.g. days the club already has a session */
  markedDates?: string[]
  /** Read after a marked day's name, e.g. "your club has a session" */
  markedLabel?: string
  className?: string
}

const ARROW_STEP: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
}

/**
 * The prototype's .dp-head and .dp-grid: a month of day buttons with previous/next month, today
 * ringed, the chosen day filled, past days disabled and arrow-key movement between days.
 */
export function DateCalendar({
  value,
  onChange,
  min,
  markedDates,
  markedLabel = 'marked',
  className,
}: DateCalendarProps) {
  const today = todayYmd()
  const selected = fromYmd(value)
  const [view, setView] = useState(() => startOfMonth(selected ?? fromYmd(today) ?? new Date()))
  const [focusYmd, setFocusYmd] = useState<string | null>(null)
  const gridRef = useRef<HTMLFieldSetElement>(null)
  const marked = new Set(markedDates)

  useEffect(() => {
    if (!focusYmd) return
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-ymd="${focusYmd}"]`)?.focus()
  }, [focusYmd])

  const isDisabled = (ymd: string) => (min ? ymd < min : false)
  const lead = view.getDay()
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) =>
    toYmd(new Date(view.getFullYear(), view.getMonth(), i + 1)),
  )
  // One day is in the tab order: the selected day, or the first selectable day of this month.
  const tabStop =
    (value && days.includes(value) ? value : undefined) ?? days.find((d) => !isDisabled(d))
  const prevDisabled = min ? toYmd(addDays(view, -1)) < min : false

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, ymd: string) => {
    const step = ARROW_STEP[event.key]
    const from = fromYmd(ymd)
    if (!step || !from) return
    event.preventDefault()
    const next = addDays(from, step)
    const nextYmd = toYmd(next)
    if (isDisabled(nextYmd)) return
    if (next.getMonth() !== view.getMonth()) setView(startOfMonth(next))
    setFocusYmd(nextYmd)
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <IconButton
          size="sm"
          label="Previous month"
          disabled={prevDisabled}
          onClick={() => setView(addMonths(view, -1))}
        >
          <Icon name="back" />
        </IconButton>
        <h3 aria-live="polite" className="text-base">
          {formatMonth(view)}
        </h3>
        <IconButton size="sm" label="Next month" onClick={() => setView(addMonths(view, 1))}>
          <Icon name="back" className="rotate-180" />
        </IconButton>
      </div>
      <fieldset
        ref={gridRef}
        aria-label="Dates"
        className="m-0 grid min-w-0 grid-cols-7 gap-1 border-0 p-0"
      >
        {WEEKDAYS.map((day) => (
          <span
            key={day}
            aria-hidden
            className="pb-1 text-center text-[11px] font-bold tracking-[0.5px] text-fg2 uppercase"
          >
            {day}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} aria-hidden />
        ))}
        {days.map((ymd) => {
          const isSelected = ymd === value
          const isToday = ymd === today
          const isMarked = marked.has(ymd)
          return (
            <button
              key={ymd}
              type="button"
              data-ymd={ymd}
              aria-pressed={isSelected}
              disabled={isDisabled(ymd) && !isSelected}
              tabIndex={ymd === tabStop ? 0 : -1}
              aria-label={`${formatLongDate(ymd)}${isToday ? ', today' : ''}${isMarked ? `, ${markedLabel}` : ''}`}
              onClick={() => onChange(ymd)}
              onKeyDown={(event) => onKeyDown(event, ymd)}
              className={cn(
                'relative grid h-11 place-items-center rounded-xl border-0 bg-transparent p-0 text-[15px] font-semibold tabular-nums',
                'hover:not-disabled:bg-elev disabled:cursor-not-allowed disabled:text-fg3',
                isToday && 'text-accent shadow-[inset_0_0_0_2px_var(--accent)]',
                isSelected && 'bg-accent text-on-accent shadow-none hover:not-disabled:bg-accent',
              )}
            >
              {Number(ymd.slice(8))}
              {isMarked ? (
                <i
                  aria-hidden
                  className={cn(
                    'absolute bottom-[5px] left-1/2 -ml-[2.5px] size-[5px] rounded-full bg-warn',
                    isSelected && 'bg-on-accent',
                  )}
                />
              ) : null}
            </button>
          )
        })}
      </fieldset>
    </div>
  )
}
