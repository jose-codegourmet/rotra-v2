'use client'

import { ClashNotice } from '@rotra/ui/clash-notice'
import { cn } from '@rotra/ui/cn'
import { formatLongDate } from '@rotra/ui/date-picker/date-calendar/helpers'
import { DateTimePicker } from '@rotra/ui/date-time-picker'
import { Field } from '@rotra/ui/field'
import { inputVariants } from '@rotra/ui/field/variants'
import { Icon } from '@rotra/ui/icon'
import { type RepeatOccurrence, RepeatSchedulePanel } from '@rotra/ui/repeat-schedule-panel'
import { TextInput } from '@rotra/ui/text-input'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import {
  clockOf,
  durationMinutes,
  formatMinutes,
  sessionDays,
  sessionTimes,
} from '../SessionSetupForm.helpers'
import type { SessionSetupInput } from '../SessionSetupForm.schema'

export type SetupDetailsSectionProps = {
  mode: 'create' | 'edit'
  /** The series dates (one when not repeating) with their clashes */
  occurrences: RepeatOccurrence[]
  onOpenDatePicker: () => void
  onOpenVenuePicker: () => void
  onViewClash: (sessionId: string) => void
}

const MINUTE = 60_000
const DAY = 864e5

/** Page 1 › Details: title, date, times, repeats (new sessions), and the venue. */
export function SetupDetailsSection({
  mode,
  occurrences,
  onOpenDatePicker,
  onOpenVenuePicker,
  onViewClash,
}: SetupDetailsSectionProps) {
  const form = useFormContext<SessionSetupInput>()
  const { errors } = form.formState
  const values = useWatch({ control: form.control })
  const times = { startTime: values.startTime ?? '19:00', endTime: values.endTime ?? '22:00' }
  const repeating = mode === 'create' && values.repeat && values.repeat !== 'none'
  const single = occurrences[0]
  const { start, end } = sessionTimes({
    date: values.date ?? '',
    startTime: times.startTime,
    endTime: times.endTime,
  })
  const everyClash = occurrences.length > 0 && occurrences.every((o) => o.clash)
  const venueError = errors.venue?.message ?? errors.venue?.venueId?.message

  return (
    <>
      <Field label="Session title" error={errors.title?.message}>
        <Controller
          control={form.control}
          name="title"
          render={({ field }) => (
            <TextInput
              {...field}
              placeholder="e.g. Thursday Open Play"
              invalid={Boolean(errors.title)}
            />
          )}
        />
      </Field>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-fg2">Date</span>
          <button
            type="button"
            onClick={onOpenDatePicker}
            aria-haspopup="dialog"
            aria-label={`Date, ${values.date ? formatLongDate(values.date) : 'none'}. Change date`}
            className={cn(
              inputVariants({}),
              'flex items-center gap-2.5 text-left hover:border-accent',
            )}
          >
            <Icon name="calendar" className="flex-none text-accent" />
            <span className="min-w-0 truncate">
              {values.date ? formatLongDate(values.date) : 'Choose a date'}
            </span>
          </button>
        </div>
        <Field label="Starts" error={errors.startTime?.message}>
          <Controller
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <DateTimePicker
                ref={field.ref}
                name={field.name}
                onBlur={field.onBlur}
                label="Starts"
                value={Number.isFinite(start) ? start : null}
                onChange={(next) => next != null && field.onChange(clockOf(next))}
                days={Number.isFinite(start) ? [start] : []}
                invalid={Boolean(errors.startTime)}
              />
            )}
          />
        </Field>
        <Field
          label="Ends"
          error={errors.endTime?.message}
          hint={formatMinutes(durationMinutes(times))}
        >
          <Controller
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <DateTimePicker
                ref={field.ref}
                name={field.name}
                onBlur={field.onBlur}
                label="Ends"
                value={Number.isFinite(end) ? end : null}
                onChange={(next) => next != null && field.onChange(clockOf(next))}
                days={sessionDays(start, start + DAY)}
                base={start}
                min={start + MINUTE}
                max={start + DAY}
                invalid={Boolean(errors.endTime)}
              />
            )}
          />
        </Field>
      </div>
      {mode === 'create' ? (
        <Controller
          control={form.control}
          name="repeat"
          render={({ field }) => (
            <Controller
              control={form.control}
              name="repeatCount"
              render={({ field: count }) => (
                <RepeatSchedulePanel
                  repeat={field.value}
                  onRepeatChange={field.onChange}
                  count={count.value}
                  onCountChange={count.onChange}
                  occurrences={repeating ? occurrences : []}
                  onViewClash={onViewClash}
                  error={
                    repeating && everyClash
                      ? 'Every date clashes with another session. Change the start date, time or venue.'
                      : undefined
                  }
                />
              )}
            />
          )}
        />
      ) : null}
      {!repeating && single?.clash ? (
        <ClashNotice
          text={single.clash.text}
          sessionId={single.clash.sessionId}
          onView={onViewClash}
        />
      ) : null}
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-fg2">Venue</span>
        <button
          type="button"
          onClick={onOpenVenuePicker}
          aria-haspopup="dialog"
          aria-label={`Venue: ${values.venue?.name || 'none chosen'}. Choose venue`}
          className={cn(
            inputVariants({ invalid: Boolean(venueError) }),
            'flex min-h-12 items-center gap-2.5 text-left hover:border-accent',
          )}
        >
          <Icon name="pin" className="flex-none text-accent" />
          <span className="flex min-w-0 flex-col">
            {values.venue?.name ? (
              <>
                <b className="truncate">{values.venue.name}</b>
                {values.venue.address ? (
                  <span className="truncate text-[13px] text-fg2">{values.venue.address}</span>
                ) : null}
              </>
            ) : (
              <span className="text-fg2">Choose or add a venue</span>
            )}
          </span>
        </button>
        <span aria-live="polite" className="text-[13px] font-semibold text-error empty:hidden">
          {venueError}
        </span>
      </div>
      <p className="m-0 text-xs text-fg2">
        The venue can differ from where your club was founded. It doesn't change your club's
        founding address.
      </p>
    </>
  )
}
