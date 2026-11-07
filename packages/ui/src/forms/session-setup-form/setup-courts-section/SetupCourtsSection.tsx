'use client'

import { CountStepper } from '@rotra/ui/count-stepper'
import { DateTimePicker } from '@rotra/ui/date-time-picker'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { TextInput } from '@rotra/ui/text-input'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { clockOf, sessionDays, sessionTimes } from '../SessionSetupForm.helpers'
import type { SessionSetupInput } from '../SessionSetupForm.schema'

const MINUTE = 60_000

export type SetupCourtsSectionProps = {
  /** Editing a prepared session: the roster and waitlist sizes for the budget warnings */
  editContext?: { rosterCount: number; waitlistCount: number }
}

/** Page 1 › Courts: how many courts, one label each, players per court, and the slot budget. */
export function SetupCourtsSection({ editContext }: SetupCourtsSectionProps) {
  const form = useFormContext<SessionSetupInput>()
  const { errors } = form.formState
  const labels = useWatch({ control: form.control, name: 'courtLabels' })
  const perCourt = useWatch({ control: form.control, name: 'playersPerCourt' })
  const session = useWatch({ control: form.control })
  const { start, end, courts } = sessionTimes({
    date: session.date ?? '',
    startTime: session.startTime ?? '',
    endTime: session.endTime ?? '',
    courtLabels: labels,
    courtStarts: session.courtStarts,
    courtEnds: session.courtEnds,
  })
  const days = sessionDays(start, end)
  const capacity = labels.length * perCourt
  const setCount = (n: number) => {
    const next = labels.slice(0, n)
    while (next.length < n) next.push(`Court ${next.length + 1}`)
    for (const key of ['courtStarts', 'courtEnds'] as const) {
      const times = (form.getValues(key) ?? []).slice(0, n)
      while (times.length < n) times.push('')
      form.setValue(key, times, { shouldDirty: true })
    }
    form.setValue('courtLabels', next, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    })
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>How many courts did you book?</span>
        <CountStepper
          value={labels.length}
          min={1}
          max={20}
          size="lg"
          onChange={setCount}
          decrementLabel="Remove a court"
          incrementLabel="Add a court"
        />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5">
        {labels.map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Field label={`Court ${i + 1} label`} error={errors.courtLabels?.[i]?.message}>
              <Controller
                control={form.control}
                name={`courtLabels.${i}`}
                render={({ field }) => (
                  <TextInput {...field} invalid={Boolean(errors.courtLabels?.[i])} />
                )}
              />
            </Field>
            <Field
              label="Planned start"
              error={errors.courtStarts?.[i]?.message}
              hint="Empty means session start."
            >
              <Controller
                control={form.control}
                name={`courtStarts.${i}`}
                render={({ field }) => (
                  <DateTimePicker
                    ref={field.ref}
                    name={field.name}
                    onBlur={field.onBlur}
                    label={`Court ${i + 1} planned start`}
                    value={field.value ? (courts[i]?.startsAt ?? null) : null}
                    onChange={(next) => field.onChange(next == null ? '' : clockOf(next))}
                    days={days}
                    base={start}
                    min={start}
                    max={end - 1}
                    fallback={start}
                    emptyLabel="Session start"
                    invalid={!!errors.courtStarts?.[i]}
                  />
                )}
              />
            </Field>
            <Field
              label="Open until"
              error={errors.courtEnds?.[i]?.message}
              hint="Empty follows the session end."
            >
              <Controller
                control={form.control}
                name={`courtEnds.${i}`}
                render={({ field }) => (
                  <DateTimePicker
                    ref={field.ref}
                    name={field.name}
                    onBlur={field.onBlur}
                    label={`Court ${i + 1} open until`}
                    value={field.value ? (courts[i]?.openUntil ?? null) : null}
                    onChange={(next) => field.onChange(next == null ? '' : clockOf(next))}
                    days={days}
                    base={start}
                    min={(courts[i]?.startsAt ?? start) + MINUTE}
                    max={end}
                    fallback={end}
                    emptyLabel="Session end"
                    invalid={!!errors.courtEnds?.[i]}
                  />
                )}
              />
            </Field>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span>Players per court</span>
          <p className="m-0 text-xs text-fg2">
            How many players you budget for each court you reserve.
          </p>
        </div>
        <Controller
          control={form.control}
          name="playersPerCourt"
          render={({ field }) => (
            <CountStepper
              ref={field.ref}
              value={field.value}
              min={2}
              max={20}
              size="lg"
              onChange={field.onChange}
              decrementLabel="Fewer players per court"
              incrementLabel="More players per court"
            />
          )}
        />
      </div>
      <Notice tone="success" title={`${capacity} slots`}>
        : {labels.length} court{labels.length > 1 ? 's' : ''} × {perCourt} players. Anyone added
        after that goes on the waitlist.
      </Notice>
      {editContext && editContext.rosterCount > capacity ? (
        <Notice tone="warn" title={`${editContext.rosterCount} players already have a slot.`}>
          With {capacity} slots, the last {editContext.rosterCount - capacity} added move to the
          front of the waitlist when you save, in the order they joined.
        </Notice>
      ) : editContext &&
        Math.min(capacity - editContext.rosterCount, editContext.waitlistCount) > 0 ? (
        <Notice>
          When you save, the first{' '}
          {Math.min(capacity - editContext.rosterCount, editContext.waitlistCount)} on the waitlist
          get the new slot
          {Math.min(capacity - editContext.rosterCount, editContext.waitlistCount) > 1 ? 's' : ''}.
        </Notice>
      ) : null}
      <p className="m-0 text-xs text-fg2">
        You can still add or remove free courts during the session; slots follow the court count.
      </p>
    </>
  )
}
