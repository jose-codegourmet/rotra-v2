'use client'

import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { DateCalendar, type DateCalendarProps } from '@rotra/ui/date-picker/date-calendar'
import { useFieldControl, useFieldLabelId } from '@rotra/ui/field'
import { inputVariants } from '@rotra/ui/field/variants'
import { Icon } from '@rotra/ui/icon'
import { Popover } from 'radix-ui'
import { type Ref, useState } from 'react'
import { formatLongDate, todayYmd } from './date-calendar/DateCalendar.helpers'

export type DatePickerProps = Pick<DateCalendarProps, 'min' | 'markedDates' | 'markedLabel'> & {
  /** "YYYY-MM-DD" or '' */
  value?: string
  onChange?: (ymd: string) => void
  onBlur?: () => void
  name?: string
  ref?: Ref<HTMLButtonElement>
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  /** Legend shown under the grid when markedDates is set */
  markedLegend?: string
  className?: string
}

/**
 * The prototype's .input.date-btn: a field-styled button with a calendar icon and the long date,
 * opening a calendar popover. Picking a day sets it and closes.
 */
export function DatePicker({
  value,
  onChange,
  onBlur,
  name,
  ref,
  placeholder = 'Choose a date',
  disabled,
  invalid,
  min,
  markedDates,
  markedLabel,
  markedLegend,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const field = useFieldControl()
  const labelId = useFieldLabelId()
  const valueId = `${field.id ?? name ?? 'date'}-value`
  const today = todayYmd()

  const pick = (ymd: string) => {
    onChange?.(ymd)
    setOpen(false)
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) onBlur?.()
      }}
    >
      <Popover.Trigger asChild>
        <button
          ref={ref}
          type="button"
          name={name}
          disabled={disabled}
          {...field}
          aria-labelledby={labelId ? `${labelId} ${valueId}` : undefined}
          aria-haspopup="dialog"
          className={cn(
            inputVariants({ invalid }),
            'flex items-center gap-2.5 text-left hover:not-disabled:border-accent',
            className,
          )}
        >
          <Icon name="calendar" className="flex-none text-accent" />
          <span id={valueId} className={cn('min-w-0 truncate', !value && 'text-fg3')}>
            {value ? formatLongDate(value) : placeholder}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          aria-label="Choose a date"
          className="z-50 flex w-[min(340px,calc(100vw-24px))] flex-col gap-3 rounded-2xl border border-border-strong bg-surface p-4 text-fg shadow-sheet"
        >
          <DateCalendar
            value={value}
            onChange={pick}
            min={min}
            markedDates={markedDates}
            markedLabel={markedLabel}
          />
          <div className="flex items-center justify-between gap-3 text-[13px] text-fg2">
            {markedDates?.length && markedLegend ? (
              <span className="inline-flex items-center gap-1">
                <i aria-hidden className="inline-block size-1.5 rounded-full bg-warn" />
                {markedLegend}
              </span>
            ) : (
              <span>Use the arrow keys to move between days.</span>
            )}
            <Button size="xs" disabled={min ? today < min : false} onClick={() => pick(today)}>
              Today
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
