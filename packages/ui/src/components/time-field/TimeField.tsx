'use client'

import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { useFieldControl } from '@rotra/ui/field'
import { inputVariants } from '@rotra/ui/field/variants'
import { Icon } from '@rotra/ui/icon'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Sheet } from '@rotra/ui/sheet'
import { Switch } from '@rotra/ui/switch'
import { type ReactNode, type Ref, useCallback, useRef, useState } from 'react'
import {
  clockParts,
  formatClockTime,
  formatTwoDigits,
  HOUR_CHOICES,
  MERIDIEMS,
  type Meridiem,
  minuteChoices,
  pickHour,
  pickMeridiem,
  pickMinute,
  type TimeWindow,
  validHours,
  validMeridiems,
  validMinutes,
} from '../date-time-picker/DateTimePicker.helpers'

const NEXT_DAY_LABEL = 'Ends the next day'
const GROUP_LABEL = 'text-xs font-semibold tracking-[0.5px] text-fg2 uppercase'

/** The dialog's "Ends the next day" switch (Ends fields only), in place of the day buttons. */
export type TimeFieldNextDay = {
  /** On while the value is on the later of the two days */
  checked: boolean
  onChange: (checked: boolean) => void
  /** The other day has no valid time */
  disabled?: boolean
}

export type TimeFieldProps = {
  /**
   * Epoch-millisecond instant shown in the field and picked from. Its calendar day is the day the
   * dialog picks on; the hour, minute and AM/PM buttons change only the clock time.
   */
  value: number
  onChange?: (value: number) => void
  /** Field name: the dialog title ("Starts") and the start of the button's name */
  label: string
  /** Inclusive lower bound; earlier times are disabled */
  min?: number
  /** Inclusive upper bound; later times are disabled */
  max?: number
  /** Muted second line under the time, e.g. "next day" */
  suffix?: ReactNode
  /** Adds the "Ends the next day" switch at the bottom of the dialog */
  nextDay?: TimeFieldNextDay
  /** Called when the time dialog opens or closes */
  onOpenChange?: (open: boolean) => void
  /** So React Hook Form can focus the field on error: lands on the field button */
  ref?: Ref<HTMLButtonElement>
  id?: string
  name?: string
  'aria-describedby'?: string
  'aria-invalid'?: true
  disabled?: boolean
  invalid?: boolean
  className?: string
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === 'function') ref(node)
  else if (ref) ref.current = node
}

type TimeButtonProps = {
  id: string
  selected: boolean
  disabled: boolean
  onPick: () => void
  children: ReactNode
}

/** The prototype's .tp-b: one hour or minute button of the time dialog. */
function TimeButton({ id, selected, disabled, onPick, children }: TimeButtonProps) {
  return (
    <button
      type="button"
      id={id}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onPick}
      className={cn(
        'min-h-11 cursor-pointer rounded-md border border-border-strong bg-transparent font-bold text-fg tabular-nums',
        'disabled:cursor-not-allowed disabled:border-border disabled:text-fg3 disabled:opacity-50',
        selected && 'border-accent bg-accent text-on-accent',
      )}
    >
      {children}
    </button>
  )
}

/**
 * The prototypes' time field (.dt-field): an input-styled button with a clock icon, the time
 * ("7:00 PM") and a chevron. Pressing it opens the time dialog (a bottom sheet on a phone): the time
 * in large type, AM | PM, 12 hour buttons, the minute buttons (:00 :15 :30 :45, plus an off-grid
 * value's minute) and Done. Only valid times can be pressed; each press sets the value at once.
 * Opened from inside another dialog, closing it returns there. Used by DateTimePicker.
 */
export function TimeField({
  value,
  onChange,
  label,
  min,
  max,
  suffix,
  nextDay,
  onOpenChange,
  ref,
  disabled,
  invalid,
  className,
  ...props
}: TimeFieldProps) {
  const field = useFieldControl()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const setTrigger = useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node
      assignRef(ref, node)
    },
    [ref],
  )

  const id = props.id ?? field.id
  const baseId = id ?? `time-${label.replace(/\W+/g, '-').toLowerCase()}`
  const shown = formatClockTime(value)

  const changeOpen = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
    // Opened from another dialog, the Sheet leaves focus alone on close: return it to this field,
    // so the dialog behind is where the operator left it.
    if (!next && typeof window !== 'undefined') {
      window.requestAnimationFrame(() => triggerRef.current?.focus())
    }
  }

  const onDay: TimeWindow = { day: value, min, max, value }
  const parts = clockParts(value)
  const hoursOn = validHours(onDay, parts.meridiem)
  const minutesOn = validMinutes(onDay, parts.hour, parts.meridiem)
  const halvesOn = validMeridiems(onDay)

  const set = (next: number | null) => {
    if (next != null && next !== value) onChange?.(next)
  }

  return (
    <>
      <button
        type="button"
        ref={setTrigger}
        name={props.name}
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-label={`${label}: ${shown}. Change time`}
        aria-describedby={props['aria-describedby'] ?? field['aria-describedby']}
        aria-invalid={props['aria-invalid'] ?? field['aria-invalid']}
        onClick={() => changeOpen(true)}
        className={cn(
          inputVariants({ invalid }),
          'flex w-full max-w-[260px] cursor-pointer items-center gap-2.5 text-left hover:not-disabled:border-accent',
          className,
        )}
      >
        <Icon name="clock" className="flex-none text-accent" />
        <span className="min-w-0 flex-1 leading-tight font-semibold tabular-nums">
          {shown}
          {suffix ? (
            <small className="block text-xs leading-tight font-medium text-fg2">{suffix}</small>
          ) : null}
        </span>
        <Icon name="down" size={14} className="flex-none text-fg2" />
      </button>
      <Sheet
        open={open}
        onOpenChange={changeOpen}
        title={label}
        returnFocusRef={triggerRef}
        className="mx-auto max-w-[420px]"
        footer={
          <Button variant="primary" onClick={() => changeOpen(false)}>
            Done
          </Button>
        }
      >
        <div
          aria-live="polite"
          className="text-center text-[40px] font-extrabold tracking-[-0.5px] tabular-nums"
        >
          {shown}
        </div>
        <SegmentedControl
          aria-label="AM or PM"
          className="self-center"
          value={parts.meridiem}
          onChange={(next) => set(pickMeridiem(onDay, parts, next as Meridiem))}
          options={MERIDIEMS.map((meridiem) => ({
            value: meridiem,
            label: meridiem,
            disabled: !halvesOn.includes(meridiem),
          }))}
        />
        <div>
          <span className={GROUP_LABEL}>Hour</span>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {HOUR_CHOICES.map((hour) => (
              <TimeButton
                key={hour}
                id={`${baseId}-hour-${hour}`}
                selected={hour === parts.hour}
                disabled={!hoursOn.includes(hour)}
                onPick={() => set(pickHour(onDay, parts, hour))}
              >
                {hour}
              </TimeButton>
            ))}
          </div>
        </div>
        <div>
          <span className={GROUP_LABEL}>Minute</span>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {minuteChoices(onDay).map((minute) => (
              <TimeButton
                key={minute}
                id={`${baseId}-minute-${minute}`}
                selected={minute === parts.minute}
                disabled={!minutesOn.includes(minute)}
                onPick={() => set(pickMinute(onDay, parts, minute))}
              >
                :{formatTwoDigits(minute)}
              </TimeButton>
            ))}
          </div>
        </div>
        {nextDay ? (
          <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
            <span>{NEXT_DAY_LABEL}</span>
            <Switch
              aria-label={NEXT_DAY_LABEL}
              checked={nextDay.checked}
              disabled={nextDay.disabled}
              onChange={nextDay.onChange}
            />
          </div>
        ) : null}
      </Sheet>
    </>
  )
}
