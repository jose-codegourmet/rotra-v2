'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { COURT_LABEL_MAX } from '@rotra/schema/court-label'
import { courtNextDay, courtWindowPreview } from '@rotra/schema/court-window'
import { Button } from '@rotra/ui/button'
import { ChoiceGroup } from '@rotra/ui/choice-group'
import { cn } from '@rotra/ui/cn'
import { DateTimePicker } from '@rotra/ui/date-time-picker'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { formatTime } from '@rotra/ui/now-card/helpers'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { type ReactNode, type RefObject, useId, useMemo } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { addCourtFormDefaultValues, toTimeInput } from './AddCourtForm.defaultValues'
import {
  type AddCourtFormInput,
  type AddCourtFormValues,
  makeAddCourtSchema,
  type OpenUntilMode,
  timeOnSession,
} from './AddCourtForm.schema'

export type AddCourtFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The next "Court N": the label field's default, and the label used when it is left empty */
  defaultLabel: string
  editing?: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
  lockedStartsAt?: number
  /** The session's start (actual once live): set times are the first such clock time from it */
  sessionStartsAt: number
  /** The session's scheduled end: "Until the session ends" and the latest set time */
  sessionEndsAt: number
  /** The current time, for validation and the preview; Date.now() when omitted */
  now?: number
  onSubmit: (values: AddCourtFormValues) => void
  /** The add is running: submit is disabled so one tap cannot add twice */
  isPending?: boolean
  /** Why the add failed; what was typed stays in the fields */
  serverError?: string
  onCancel?: () => void
  defaultValues?: Partial<AddCourtFormInput>
}

const MINUTE = 60_000

const duration = (minutes: number) => {
  const hours = Math.floor(minutes / 60),
    rest = minutes % 60
  return [hours ? `${hours} h` : '', rest ? `${rest} min` : ''].filter(Boolean).join(' ') || '0 min'
}

/**
 * Q-ADD-COURT: the Add court sheet. Court label, Open until (with the session or at a set time on the
 * session's day), the validated booking-window preview, and the reminder that ROTRA doesn't stop games.
 * The container owns the add mutation and its "LABEL added · open until HH:MM" toast.
 */
export function AddCourtForm({
  open,
  onOpenChange,
  defaultLabel,
  editing = false,
  returnFocusRef,
  lockedStartsAt,
  sessionStartsAt,
  sessionEndsAt,
  now,
  onSubmit,
  isPending = false,
  serverError,
  onCancel,
  defaultValues,
}: AddCourtFormProps) {
  const formId = useId()
  const timeErrorId = `${formId}-time-error`
  const current = now ?? Date.now()
  const schema = useMemo(
    () =>
      makeAddCourtSchema({
        sessionStartsAt,
        sessionEndsAt,
        fallbackLabel: defaultLabel,
        lockedStartsAt,
      }),
    [sessionStartsAt, sessionEndsAt, defaultLabel, lockedStartsAt],
  )
  const form = useForm<AddCourtFormInput, unknown, AddCourtFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...addCourtFormDefaultValues(sessionEndsAt, sessionStartsAt),
      label: defaultLabel,
      ...defaultValues,
    },
  })
  const { errors } = form.formState
  const [typedLabel, mode, time, startTime] = form.watch(['label', 'mode', 'time', 'startTime'])
  const plannedStart = startTime ? timeOnSession(sessionStartsAt, startTime) : sessionStartsAt
  const closesAtPicked = time ? timeOnSession(sessionStartsAt, time) : null
  const days = [sessionStartsAt, sessionEndsAt]
  const label = (typedLabel ?? '').trim() || defaultLabel
  // Parse the watched values through submit's schema, so errors and offending fields agree.
  const parsed = schema.safeParse({ label: typedLabel ?? '', mode, time, startTime })
  const issues = parsed.success ? [] : parsed.error.issues
  const startError = issues.find((issue) => issue.path[0] === 'startTime')?.message
  const timeError = issues.find((issue) => issue.path[0] === 'time')?.message
  const preview = parsed.success
    ? courtWindowPreview({
        start: parsed.data.startsAt,
        end: parsed.data.openUntil,
        sessionStart: sessionStartsAt,
        sessionEnd: sessionEndsAt,
        now: current,
      })
    : null
  const timeLabel = (at: number) => (
    <b>
      {formatTime(at)}
      {courtNextDay(at, sessionStartsAt) ? ' · next day' : ''}
    </b>
  )
  const validPreview = preview && !('error' in preview) ? preview : null
  const ended = validPreview !== null && validPreview.closesAt <= current
  const follows = mode === 'end' ? ' Moves if you extend time.' : ''
  let previewCopy: ReactNode = null
  if (validPreview) {
    const { opensAt, closesAt, lengthMin, opensInMin } = validPreview
    if (ended)
      previewCopy = (
        <>
          {' '}
          booking ended at {timeLabel(closesAt)} ({duration(lengthMin)} booking).{follows}
        </>
      )
    else if (opensInMin === null)
      previewCopy = (
        <>
          {' '}
          is open now until {mode === 'end' ? 'the session ends at ' : ''}
          {timeLabel(closesAt)} (about{' '}
          {duration(Math.max(1, Math.round((closesAt - current) / MINUTE)))} left).{follows}
        </>
      )
    else if (mode === 'end')
      previewCopy = (
        <>
          {' '}
          opens {timeLabel(opensAt)} and stays open until the session ends at {timeLabel(closesAt)}{' '}
          ({duration(lengthMin)}). Moves if you extend time. Opens in {duration(opensInMin)}.
        </>
      )
    else
      previewCopy = (
        <>
          {' '}
          opens {timeLabel(opensAt)} and closes {timeLabel(closesAt)} ({duration(lengthMin)}{' '}
          booking). Opens in {duration(opensInMin)}.
        </>
      )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title={`${editing ? 'Edit' : 'Add'} ${label}?`}
      dismissible={!isPending}
      returnFocusRef={returnFocusRef}
      footer={
        <>
          <Button disabled={isPending} onClick={onCancel ?? (() => onOpenChange(false))}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={isPending}>
            {editing ? 'Save court' : `Add ${label}`}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form
          id={formId}
          noValidate
          className="flex flex-col gap-3.5"
          onSubmit={form.handleSubmit((values) => {
            if (!isPending) onSubmit(values)
          })}
        >
          {serverError ? <Notice tone="error">{serverError}</Notice> : null}
          <Field label="Court label" error={errors.label?.message}>
            <Controller
              control={form.control}
              name="label"
              render={({ field }) => (
                <TextInput
                  {...field}
                  disabled={isPending}
                  maxLength={COURT_LABEL_MAX}
                  autoComplete="off"
                  autoFocus
                />
              )}
            />
          </Field>
          <Field
            label="Planned start"
            error={startError}
            hint={
              lockedStartsAt === undefined
                ? 'The court is unavailable before this time.'
                : 'Start is fixed after use.'
            }
          >
            <Controller
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <DateTimePicker
                  ref={field.ref}
                  name={field.name}
                  onBlur={field.onBlur}
                  label="Planned start"
                  value={plannedStart}
                  onChange={(next) => next != null && field.onChange(toTimeInput(next))}
                  days={days}
                  base={sessionStartsAt}
                  min={sessionStartsAt}
                  max={sessionEndsAt - 1}
                  disabled={isPending || lockedStartsAt !== undefined}
                  invalid={!!startError}
                />
              )}
            />
          </Field>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-fg2">Open until</span>
            <Controller
              control={form.control}
              name="mode"
              render={({ field }) => (
                <ChoiceGroup
                  type="single"
                  aria-label="Open until"
                  value={field.value}
                  disabled={isPending}
                  onChange={(value) => field.onChange(value as OpenUntilMode)}
                  choices={[
                    {
                      value: 'end',
                      title: 'Until the session ends',
                      description: `${formatTime(sessionEndsAt)} · moves if you extend time`,
                    },
                    {
                      value: 'time',
                      title: 'Until a set time',
                      description: 'For a court booked for less time',
                    },
                  ]}
                />
              )}
            />
            {mode === 'time' ? (
              <Controller
                control={form.control}
                name="time"
                render={({ field }) => (
                  <DateTimePicker
                    ref={field.ref}
                    name={field.name}
                    onBlur={field.onBlur}
                    label="Open until"
                    value={closesAtPicked}
                    onChange={(next) => field.onChange(next == null ? '' : toTimeInput(next))}
                    days={days}
                    base={sessionStartsAt}
                    min={plannedStart + MINUTE}
                    max={sessionEndsAt}
                    fallback={sessionEndsAt}
                    disabled={isPending}
                    invalid={Boolean(timeError)}
                  />
                )}
              />
            ) : null}
            <span
              id={timeErrorId}
              aria-live="polite"
              className={cn('text-[13px] font-semibold text-error', !timeError && 'hidden')}
            >
              {timeError}
            </span>
          </div>
          {validPreview ? (
            <Notice tone={ended ? 'info' : 'success'}>
              <b>{label}</b>
              {previewCopy}
            </Notice>
          ) : null}
          <p className="m-0 text-[13px] text-fg2">
            Courts show their closing time on the card. ROTRA doesn't stop a game at that time; it's
            a reminder for you.
          </p>
        </form>
      </FormProvider>
    </Sheet>
  )
}
