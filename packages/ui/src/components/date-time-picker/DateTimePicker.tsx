'use client'

import { cn } from '@rotra/ui/cn'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { TimeField } from '@rotra/ui/time-field'
import { type ReactNode, type Ref, useCallback, useRef } from 'react'
import {
  clockParts,
  fifteenMinuteTimesOnDay,
  formatDayButtonLabel,
  instantAtClock,
  instantForDay,
  offeredDayStarts,
  setTimeInstant,
  startOfDay,
  validTimes,
} from './DateTimePicker.helpers'

const NO_TIMES_LEFT = 'No times left on this day'
const SET_TIME = 'Set time'
const MODE_EMPTY = 'empty'
const MODE_SET = 'set'

export type DateTimePickerProps = {
  /** Epoch millisecond instant, or null when the empty option is selected */
  value: number | null
  onChange?: (value: number | null) => void
  /** Called when focus leaves the whole picker (not while its time dialog is open) */
  onBlur?: () => void
  name?: string
  /**
   * So React Hook Form can focus the field on error: the time field button, or, while the empty
   * option is on, the empty-option group (focusing it moves focus to its pressed button).
   */
  ref?: Ref<HTMLElement>
  /** Calendar days this field may fall on (any instant on the day is enough) */
  days: readonly number[]
  /** Inclusive lower bound; times before this are omitted */
  min?: number
  /** Inclusive upper bound; times after this are omitted */
  max?: number
  /** Day that "· next day" is relative to; defaults to the first offered day */
  base?: number
  /** Day and clock to start from when `value` is empty (court fields: session start / end) */
  fallback?: number
  /** Empty option, e.g. "Session start" / "Session end", beside "Set time" */
  emptyLabel?: string
  /**
   * Ends fields: with two offered days, hide the day buttons and put an "Ends the next day" switch
   * in the time dialog instead (the prototype's hideDays).
   */
  nextDaySwitch?: boolean
  /** Muted second line in the time field under the time, e.g. "next day" */
  suffix?: ReactNode
  /** Field name: the time dialog title, and "LABEL: day", "LABEL: mode", "LABEL: TIME. Change time" */
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

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === 'function') ref(node)
  else if (ref) ref.current = node
}

/**
 * Date-and-time picker: an empty option ("Session start" | "Set time") when the field has one, day
 * buttons when the field can fall on more than one day (or, on Ends, an "Ends the next day" switch
 * in the time dialog), then one time field ("7:00 PM") that opens the time dialog. Only valid times
 * can be picked (15-minute steps inside min / max; an off-grid current value is kept). Each press
 * sets the value at once. Place inside a Field.
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
  nextDaySwitch,
  suffix,
  label,
  disabled,
  invalid,
  className,
}: DateTimePickerProps) {
  const controlRef = useCallback((node: HTMLElement | null) => assignRef(ref, node), [ref])
  // While the time dialog is open, focus sits in it (outside this fieldset): not a blur.
  const dialogOpen = useRef(false)
  const offered = offeredDayStarts(days)
  const baseDay = startOfDay(base ?? offered[0] ?? 0)
  const shown = shownDayStart(days, value, fallback)
  const hasEmpty = emptyLabel != null
  const isEmpty = value == null
  const times = shown == null ? [] : validTimes({ day: shown, min, max, value })
  const showTime = !(hasEmpty && isEmpty)
  const useSwitch = nextDaySwitch === true && offered.length > 1

  const set = (next: number | null) => {
    if (next != null && next !== value) onChange?.(next)
  }

  const pickDay = (next: string) => {
    const day = Number(next)
    const from = value ?? fallback ?? null
    if (from != null && startOfDay(from) === day) return
    set(instantForDay(day, from, min, max))
  }

  const pickMode = (mode: string) => {
    if (mode === MODE_EMPTY) {
      if (!isEmpty) onChange?.(null)
      return
    }
    set(setTimeInstant(days, min, max, fallback))
  }

  let timeRow: ReactNode = null
  if (showTime && shown != null) {
    if (times.length === 0) {
      timeRow = <p className="m-0 flex min-h-11 items-center text-fg3">{NO_TIMES_LEFT}</p>
    } else {
      // The clock the field shows and the dialog builds from: the value, else the fallback, else
      // the day's first valid time, on the shown day.
      const from = clockParts(value ?? fallback ?? times[0] ?? shown)
      const at = instantAtClock(shown, from.hour, from.minute, from.meridiem)
      const otherDay = offered.find((day) => day !== shown)
      timeRow = (
        <TimeField
          ref={controlRef}
          name={name}
          label={label}
          value={at}
          min={min}
          max={max}
          suffix={suffix}
          disabled={disabled}
          invalid={invalid}
          onChange={set}
          onOpenChange={(open) => {
            dialogOpen.current = open
          }}
          nextDay={
            useSwitch && otherDay != null
              ? {
                  checked: shown !== offered[0],
                  disabled: fifteenMinuteTimesOnDay(otherDay, min, max).length === 0,
                  onChange: () => pickDay(String(otherDay)),
                }
              : undefined
          }
        />
      )
    }
  }

  return (
    <fieldset
      aria-label={label}
      className={cn('m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0', className)}
      onBlur={(event) => {
        if (dialogOpen.current) return
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.()
      }}
    >
      {hasEmpty ? (
        <SegmentedControl
          ref={isEmpty ? controlRef : undefined}
          aria-label={`${label}: mode`}
          disabled={disabled}
          value={isEmpty ? MODE_EMPTY : MODE_SET}
          onChange={pickMode}
          options={[
            { value: MODE_EMPTY, label: emptyLabel },
            {
              value: MODE_SET,
              label: SET_TIME,
              disabled: setTimeInstant(days, min, max, fallback) == null,
            },
          ]}
        />
      ) : null}
      {showTime && offered.length > 1 && !useSwitch ? (
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
      {timeRow}
    </fieldset>
  )
}
