'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@rotra/ui/button'
import { ChoiceGroup } from '@rotra/ui/choice-group'
import { cn } from '@rotra/ui/cn'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { formatDuration, formatTime } from '@rotra/ui/now-card/helpers'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { TimeField } from '@rotra/ui/time-field'
import { useId, useMemo } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { addCourtFormDefaultValues } from './AddCourtForm.defaultValues'
import {
  type AddCourtFormInput,
  type AddCourtFormValues,
  COURT_LABEL_MAX,
  makeAddCourtSchema,
  type OpenUntilMode,
  timeOnSession,
} from './AddCourtForm.schema'

export type AddCourtFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The next "Court N": the label field's default, and the label used when it is left empty */
  defaultLabel: string
  /** The session's start: set times are placed on this day (the next when earlier, overnight) */
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

/**
 * Q-ADD-COURT: the Add court sheet. Court label, Open until (with the session or at a set time on the
 * session's day), the preview of when it closes, and the reminder that ROTRA doesn't stop games.
 * The container owns the add mutation and its "LABEL added · open until HH:MM" toast.
 */
export function AddCourtForm({
  open,
  onOpenChange,
  defaultLabel,
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
        now: current,
        sessionStartsAt,
        sessionEndsAt,
        fallbackLabel: defaultLabel,
      }),
    [current, sessionStartsAt, sessionEndsAt, defaultLabel],
  )
  const form = useForm<AddCourtFormInput, unknown, AddCourtFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...addCourtFormDefaultValues(sessionEndsAt),
      label: defaultLabel,
      ...defaultValues,
    },
  })
  const { errors } = form.formState
  const [typedLabel, mode, time] = form.watch(['label', 'mode', 'time'])
  const label = (typedLabel ?? '').trim() || defaultLabel

  // The preview: when the court closes and how long that is from now (prototype's addCourt(sh)).
  const until = mode === 'end' ? sessionEndsAt : time ? timeOnSession(sessionStartsAt, time) : null
  const minutes = until === null ? null : Math.round((until - current) / MINUTE)
  const timeError = errors.time?.message

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title={`Add ${label}?`}
      dismissible={!isPending}
      footer={
        <>
          <Button disabled={isPending} onClick={onCancel ?? (() => onOpenChange(false))}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={isPending}>
            Add {label}
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
                <TextInput {...field} maxLength={COURT_LABEL_MAX} autoComplete="off" autoFocus />
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
                  <TimeField
                    {...field}
                    aria-label="Open until"
                    aria-invalid={timeError ? true : undefined}
                    aria-describedby={timeError ? timeErrorId : undefined}
                    invalid={Boolean(timeError)}
                    className="max-w-[180px]"
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
          {until !== null && minutes !== null && minutes > 0 ? (
            <Notice tone="success">
              <b>{label}</b> will be free right away and open until <b>{formatTime(until)}</b>,
              about {formatDuration(current, until)} from now.
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
