'use client'

import { cn } from '@rotra/ui/cn'
import { useFieldControl } from '@rotra/ui/field'
import { inputVariants } from '@rotra/ui/field/variants'
import { Icon } from '@rotra/ui/icon'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { type ReactNode, type Ref, useCallback } from 'react'
import {
  type ClockDraft,
  clockDraft,
  clockParts,
  fifteenMinuteTimesOnDay,
  formatDayButtonLabel,
  formatTwoDigits,
  HOUR_CHOICES,
  instantForDay,
  MERIDIEMS,
  type Meridiem,
  minuteChoices,
  offeredDayStarts,
  pickHour,
  pickMeridiem,
  pickMinute,
  setTimeInstant,
  startOfDay,
  type TimeWindow,
  validHours,
  validMeridiems,
  validMinutes,
  validTimes,
} from './DateTimePicker.helpers'

const NO_TIMES_LEFT = 'No times left on this day'
const SET_TIME = 'Set time'
const MODE_EMPTY = 'empty'
const MODE_SET = 'set'
/** Shown in a dropdown while that part of the time is not chosen yet */
const UNSET = ''
const UNSET_LABEL = '--'

export type DateTimePickerProps = {
  /** Epoch millisecond instant, or null when the empty option is selected */
  value: number | null
  onChange?: (value: number | null) => void
  /** Called when focus leaves the whole picker */
  onBlur?: () => void
  name?: string
  /**
   * So React Hook Form can focus the field on error: the hour dropdown, or, while the empty option
   * is on, the empty-option group (focusing it moves focus to its pressed button).
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
  /** Field name used in "LABEL: day", "LABEL: hour", "LABEL: minute", "LABEL: AM or PM" */
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

type TimeSelectProps = {
  'aria-label': string
  value: string
  onChange: (next: string) => void
  options: { value: string; label: string; disabled: boolean }[]
  invalid?: boolean
  disabled?: boolean
  className?: string
  ref?: Ref<HTMLSelectElement>
  id?: string
  name?: string
  'aria-describedby'?: string
  'aria-invalid'?: true
}

/** One compact field-styled dropdown of the time row, with the chevron drawn on the right. */
function TimeSelect({ value, onChange, options, invalid, className, ...props }: TimeSelectProps) {
  return (
    <div className={cn('relative min-w-0 flex-auto', className)}>
      <select
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputVariants({ invalid }), 'appearance-none pr-4 pl-1.5 tabular-nums')}
      >
        {value === UNSET ? (
          <option value={UNSET} disabled>
            {UNSET_LABEL}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        name="down"
        size={12}
        className="pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 text-fg2"
      />
    </div>
  )
}

/**
 * Date-and-time picker: an empty option ("Session start" | "Set time") when the field has one, day
 * buttons when the field can fall on more than one day, then one row of hour : minute and AM/PM
 * dropdowns that only allow valid times (15-minute steps inside min / max; an off-grid current
 * value is kept). Each change sets the value at once. Place inside a Field.
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
  const controlRef = useCallback((node: HTMLElement | null) => assignRef(ref, node), [ref])
  const offered = offeredDayStarts(days)
  const baseDay = startOfDay(base ?? offered[0] ?? 0)
  const shown = shownDayStart(days, value, fallback)
  const hasEmpty = emptyLabel != null
  const isEmpty = value == null
  const onDay: TimeWindow | null = shown == null ? null : { day: shown, min, max, value }
  const times = onDay ? validTimes(onDay) : []
  const draft: ClockDraft = onDay
    ? clockDraft(onDay, fallback)
    : { hour: null, minute: null, meridiem: null }
  const current = value != null && shown != null && startOfDay(value) === shown ? value : null
  const parts = current == null ? null : clockParts(current)
  const showTime = !(hasEmpty && isEmpty)

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
  if (showTime && onDay) {
    if (times.length === 0) {
      timeRow = <p className="m-0 flex min-h-11 items-center text-fg3">{NO_TIMES_LEFT}</p>
    } else {
      const hoursOn = validHours(onDay, draft.meridiem)
      const minutesOn = validMinutes(onDay, draft.hour, draft.meridiem)
      const halvesOn = validMeridiems(onDay)
      const shared = {
        invalid,
        disabled,
        'aria-describedby': field['aria-describedby'],
        'aria-invalid': field['aria-invalid'],
      }
      timeRow = (
        <div className="flex min-w-0 items-center">
          <TimeSelect
            {...shared}
            ref={controlRef}
            id={field.id}
            name={name}
            aria-label={`${label}: hour`}
            value={parts ? String(parts.hour) : UNSET}
            onChange={(next) => set(pickHour(onDay, draft, Number(next)))}
            options={HOUR_CHOICES.map((hour) => ({
              value: String(hour),
              label: formatTwoDigits(hour),
              disabled: !hoursOn.includes(hour),
            }))}
          />
          <span aria-hidden className="flex-none px-1 font-bold text-fg2">
            :
          </span>
          <TimeSelect
            {...shared}
            aria-label={`${label}: minute`}
            value={parts ? String(parts.minute) : UNSET}
            onChange={(next) => set(pickMinute(onDay, draft, Number(next)))}
            options={minuteChoices(onDay).map((minute) => ({
              value: String(minute),
              label: formatTwoDigits(minute),
              disabled: !minutesOn.includes(minute),
            }))}
          />
          <TimeSelect
            {...shared}
            className="ml-2"
            aria-label={`${label}: AM or PM`}
            value={parts?.meridiem ?? draft.meridiem ?? UNSET}
            onChange={(next) => set(pickMeridiem(onDay, draft, next as Meridiem))}
            options={MERIDIEMS.map((meridiem) => ({
              value: meridiem,
              label: meridiem,
              disabled: !halvesOn.includes(meridiem),
            }))}
          />
        </div>
      )
    }
  }

  return (
    <fieldset
      aria-label={label}
      className={cn('m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0', className)}
      onBlur={(event) => {
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
      {showTime && offered.length > 1 ? (
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
