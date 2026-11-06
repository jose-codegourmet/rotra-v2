'use client'

import { cn } from '@rotra/ui/cn'
import { useFieldControl } from '@rotra/ui/field'
import { inputVariants } from '@rotra/ui/field/variants'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import type { Ref } from 'react'
import {
  fifteenMinuteTimesOnDay,
  formatClockTime,
  formatDayButtonLabel,
  instantForDay,
  listedTimesOnDay,
  offeredDayStarts,
  startOfDay,
} from './DateTimePicker.helpers'

const EMPTY_VALUE = ''
const NO_TIMES_LEFT = 'No times left on this day'

export type DateTimePickerProps = {
  /** Epoch millisecond instant, or null when the empty option is selected */
  value: number | null
  onChange?: (value: number | null) => void
  onBlur?: () => void
  name?: string
  /** Ref to the time list, so React Hook Form can focus it on error */
  ref?: Ref<HTMLSelectElement>
  /** Calendar days this field may fall on (any instant on the day is enough) */
  days: readonly number[]
  /** Inclusive lower bound; times before this are omitted */
  min?: number
  /** Inclusive upper bound; times after this are omitted */
  max?: number
  /** Day that "· next day" is relative to; defaults to the first offered day */
  base?: number
  /** Day and clock to show when `value` is empty (court fields: session start / end) */
  fallback?: number
  /** Empty option, e.g. "Session start" / "Session end" */
  emptyLabel?: string
  /** Field name used in "LABEL: day" and "LABEL: time" */
  label: string
  disabled?: boolean
  invalid?: boolean
  className?: string
}

function shownDayStart(
  days: readonly number[],
  value: number | null,
  fallback: number | undefined,
): number | undefined {
  const offered = offeredDayStarts(days)
  if (offered.length === 0) return undefined
  const preferred = value ?? fallback
  if (preferred != null) {
    const start = startOfDay(preferred)
    if (offered.includes(start)) return start
  }
  return offered[0]
}

/**
 * Date-and-time picker: day buttons when the field can fall on more than one day,
 * then a list of only the valid times in 15-minute steps. An off-grid current value
 * stays listed so it can be kept. Place inside a Field.
 */
export function DateTimePicker({
  value,
  onChange,
  onBlur,
  name,
  ref,
  days,
  min,
  max,
  base,
  fallback,
  emptyLabel,
  label,
  disabled,
  invalid,
  className,
}: DateTimePickerProps) {
  const field = useFieldControl()
  const offered = offeredDayStarts(days)
  const baseDay = startOfDay(base ?? offered[0] ?? 0)
  const shown = shownDayStart(days, value, fallback)
  const times = shown == null ? [] : listedTimesOnDay(shown, min, max, value)
  const noTimesLeft = times.length === 0 && emptyLabel == null
  const selectValue = value != null && times.includes(value) ? String(value) : EMPTY_VALUE

  const pickDay = (next: string) => {
    const day = Number(next)
    const from = value ?? fallback ?? null
    if (from != null && startOfDay(from) === day) return
    const nextValue = instantForDay(day, from, min, max)
    if (nextValue != null) onChange?.(nextValue)
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {offered.length > 1 ? (
        <SegmentedControl
          aria-label={`${label}: day`}
          disabled={disabled}
          value={shown == null ? String(offered[0]) : String(shown)}
          onChange={pickDay}
          options={offered.map((day) => ({
            value: String(day),
            label: formatDayButtonLabel(day, baseDay),
            disabled: fifteenMinuteTimesOnDay(day, min, max).length === 0,
          }))}
        />
      ) : null}
      <select
        ref={ref}
        {...field}
        name={name}
        disabled={disabled}
        value={selectValue}
        aria-label={`${label}: time`}
        onBlur={onBlur}
        onChange={(event) => {
          const next = event.target.value
          onChange?.(next === EMPTY_VALUE ? null : Number(next))
        }}
        className={cn(inputVariants({ invalid }))}
      >
        {emptyLabel != null ? <option value={EMPTY_VALUE}>{emptyLabel}</option> : null}
        {times.map((instant) => (
          <option key={instant} value={String(instant)}>
            {formatClockTime(instant)}
          </option>
        ))}
        {noTimesLeft ? (
          <option value={EMPTY_VALUE} disabled>
            {NO_TIMES_LEFT}
          </option>
        ) : null}
      </select>
    </div>
  )
}
