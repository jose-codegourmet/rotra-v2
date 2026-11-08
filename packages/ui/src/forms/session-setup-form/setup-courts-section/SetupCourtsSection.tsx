'use client'

import { Button } from '@rotra/ui/button'
import { CountStepper } from '@rotra/ui/count-stepper'
import { DateTimePicker } from '@rotra/ui/date-time-picker'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { SetupCourtPicture, SetupCourtPictureGrid } from '@rotra/ui/setup-court-picture'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { type ReactNode, useId, useRef, useState } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { clockOf, formatCourtTime, sessionDays, sessionTimes } from '../SessionSetupForm.helpers'
import type { SessionSetupInput } from '../SessionSetupForm.schema'

const MINUTE = 60_000

export type SetupCourtsSectionProps = {
  /** Editing a prepared session: the roster and waitlist sizes for the budget warnings */
  editContext?: { rosterCount: number; waitlistCount: number }
}

/** The prototype's .stepcard: a label over a − count + stepper, in a bordered card. */
function StepCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <span className="text-[13px] text-fg2">{label}</span>
      {children}
    </div>
  )
}

/**
 * Page 1 › Courts: Courts booked and Players per court side by side, one court picture per booked
 * court (pressing one opens Edit Court N: label, planned start, planned end, Done), the slot budget,
 * the edit-time waitlist warnings and any court-time error.
 */
export function SetupCourtsSection({ editContext }: SetupCourtsSectionProps) {
  const form = useFormContext<SessionSetupInput>()
  const { errors } = form.formState
  const labels = useWatch({ control: form.control, name: 'courtLabels' })
  const perCourt = useWatch({ control: form.control, name: 'playersPerCourt' })
  const session = useWatch({ control: form.control })
  const [dialog, setDialog] = useState<number | null>(null)
  const pictures = useRef<(HTMLButtonElement | null)[]>([])
  // Where focus goes when Edit Court closes: the picture that opened it.
  const returnFocus = useRef<HTMLButtonElement | null>(null)
  const errorId = useId()
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
  const courtError = (i: number) =>
    errors.courtLabels?.[i]?.message ??
    errors.courtStarts?.[i]?.message ??
    errors.courtEnds?.[i]?.message
  const courtErrors = [
    ...new Set(labels.map((_, i) => courtError(i)).filter((m): m is string => Boolean(m))),
  ]
  const open = dialog != null && dialog < labels.length ? dialog : null
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
  const changeOpen = (next: boolean) => {
    if (next) return
    returnFocus.current = open == null ? null : (pictures.current[open] ?? null)
    setDialog(null)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <StepCard label="Courts booked">
          <CountStepper
            value={labels.length}
            min={1}
            max={20}
            size="lg"
            onChange={setCount}
            decrementLabel="Remove a court"
            incrementLabel="Add a court"
            className="justify-between gap-1.5"
          />
        </StepCard>
        <StepCard label="Players per court">
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
                className="justify-between gap-1.5"
              />
            )}
          />
        </StepCard>
      </div>
      <SetupCourtPictureGrid>
        {labels.map((label, i) => {
          const court = courts[i]
          const from = session.courtStarts?.[i] && court ? formatCourtTime(court.startsAt) : ''
          const until =
            session.courtEnds?.[i] && court?.openUntil != null
              ? formatCourtTime(court.openUntil)
              : ''
          return (
            <SetupCourtPicture
              key={i}
              ref={(node) => {
                pictures.current[i] = node
              }}
              label={label || `Court ${i + 1}`}
              players={perCourt}
              plannedStart={from}
              plannedEnd={until}
              invalid={Boolean(courtError(i))}
              errorId={errorId}
              onPress={() => setDialog(i)}
            />
          )
        })}
      </SetupCourtPictureGrid>
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
      <span
        id={errorId}
        aria-live="polite"
        className="text-[13px] font-semibold text-error empty:hidden"
      >
        {courtErrors.length > 0 ? `${courtErrors.join(' ')} Press a court to fix it.` : null}
      </span>
      <p className="m-0 text-xs text-fg2">
        You can still add or remove free courts during the session; slots follow the court count.
      </p>
      <Sheet
        open={open != null}
        onOpenChange={changeOpen}
        title={open == null ? '' : `Edit ${labels[open] || `Court ${open + 1}`}`}
        returnFocusRef={returnFocus}
        footer={
          <Button variant="primary" onClick={() => changeOpen(false)}>
            Done
          </Button>
        }
      >
        {open == null ? null : (
          <div key={open} className="flex flex-col gap-3.5">
            <Field label="Court label" error={errors.courtLabels?.[open]?.message}>
              <Controller
                control={form.control}
                name={`courtLabels.${open}`}
                render={({ field }) => (
                  <TextInput {...field} invalid={Boolean(errors.courtLabels?.[open])} />
                )}
              />
            </Field>
            <Field
              label="Planned start"
              error={errors.courtStarts?.[open]?.message}
              hint="Empty means session start"
            >
              <Controller
                control={form.control}
                name={`courtStarts.${open}`}
                render={({ field }) => (
                  <DateTimePicker
                    ref={field.ref}
                    name={field.name}
                    onBlur={field.onBlur}
                    label="Planned start"
                    value={field.value ? (courts[open]?.startsAt ?? null) : null}
                    onChange={(next) => field.onChange(next == null ? '' : clockOf(next))}
                    days={days}
                    base={start}
                    min={start}
                    max={end - 1}
                    fallback={start}
                    emptyLabel="Session start"
                    invalid={!!errors.courtStarts?.[open]}
                  />
                )}
              />
            </Field>
            <Field
              label="Planned end"
              error={errors.courtEnds?.[open]?.message}
              hint="Empty follows session end"
            >
              <Controller
                control={form.control}
                name={`courtEnds.${open}`}
                render={({ field }) => (
                  <DateTimePicker
                    ref={field.ref}
                    name={field.name}
                    onBlur={field.onBlur}
                    label="Planned end"
                    value={field.value ? (courts[open]?.openUntil ?? null) : null}
                    onChange={(next) => field.onChange(next == null ? '' : clockOf(next))}
                    days={days}
                    base={start}
                    min={(courts[open]?.startsAt ?? start) + MINUTE}
                    max={end}
                    fallback={end}
                    emptyLabel="Session end"
                    invalid={!!errors.courtEnds?.[open]}
                  />
                )}
              />
            </Field>
            <p className="m-0 text-xs text-fg2">
              Empty times follow the session. A court can open later or close earlier, never outside
              the session.
            </p>
          </div>
        )}
      </Sheet>
    </>
  )
}
