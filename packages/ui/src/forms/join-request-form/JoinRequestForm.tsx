'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@rotra/ui/button'
import { ChoiceGroup } from '@rotra/ui/choice-group'
import { cn } from '@rotra/ui/cn'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { TextInput } from '@rotra/ui/text-input'
import { useId } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { joinRequestFormDefaultValues } from './JoinRequestForm.defaultValues'
import {
  BAND_CHOICES,
  type JoinRequestFormInput,
  type JoinRequestFormValues,
  joinRequestSchema,
  NICKNAME_MAX,
} from './JoinRequestForm.schema'

export type JoinRequestFormProps = {
  /** The session being requested, as the prototype writes it: "title · date, time · venue" */
  sessionLine: string
  onSubmit: (values: JoinRequestFormValues) => void
  /** The request is being sent: submit is disabled so one tap cannot send twice */
  isPending?: boolean
  /** Why sending failed; what was typed stays in the fields */
  serverError?: string
  onCancel: () => void
  /** Puts the cursor in the name field on mount, as the Request to join sheet does */
  autoFocus?: boolean
  defaultValues?: Partial<JoinRequestFormInput>
  className?: string
}

export const PHONE_HINT =
  'Helps the club recognise you and link your ROTRA profile. Only the club sees it.'
export const LEVEL_HINT = 'Your best guess. The Queue Master sets your level for the night.'
export const REQUEST_NOTE =
  'This is a request, not a booking. The Queue Master confirms each guest before giving a slot.'

/**
 * Q-PUBLIC-JOIN › Request to join: the guest's name, optional nickname and phone, and their
 * self-declared level. The container owns the mutation, the "Request sent" toast and serverError;
 * a failed send keeps what was typed.
 */
export function JoinRequestForm({
  sessionLine,
  onSubmit,
  isPending = false,
  serverError,
  onCancel,
  autoFocus,
  defaultValues,
  className,
}: JoinRequestFormProps) {
  const id = useId()
  const form = useForm<JoinRequestFormInput, unknown, JoinRequestFormValues>({
    resolver: zodResolver(joinRequestSchema),
    defaultValues: { ...joinRequestFormDefaultValues, ...defaultValues },
  })
  const { errors } = form.formState

  return (
    <FormProvider {...form}>
      <form
        id={`join-request${id}`}
        noValidate
        className={cn('flex flex-col gap-3', className)}
        onSubmit={form.handleSubmit((values) => {
          if (!isPending) onSubmit(values)
        })}
      >
        <p className="m-0 text-[13px] text-fg2">{sessionLine}</p>
        {serverError ? <Notice tone="error">{serverError}</Notice> : null}
        <Field label="Your name" error={errors.name?.message}>
          <Controller
            control={form.control}
            name="name"
            render={({ field }) => (
              <TextInput {...field} autoComplete="name" autoFocus={autoFocus} />
            )}
          />
        </Field>
        <Field label="Nickname" optional error={errors.nickname?.message}>
          <Controller
            control={form.control}
            name="nickname"
            render={({ field }) => (
              <TextInput {...field} maxLength={NICKNAME_MAX} autoComplete="nickname" />
            )}
          />
        </Field>
        <Field
          label="Phone"
          optional
          hint={errors.phone ? undefined : PHONE_HINT}
          error={errors.phone?.message}
        >
          <Controller
            control={form.control}
            name="phone"
            render={({ field }) => (
              <TextInput {...field} type="tel" inputMode="tel" autoComplete="tel" />
            )}
          />
        </Field>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span id={`${id}-level`} className="text-[13px] font-semibold text-fg2">
            Your level
          </span>
          <Controller
            control={form.control}
            name="statedBand"
            render={({ field }) => (
              <ChoiceGroup
                type="single"
                aria-label="Your level"
                choices={BAND_CHOICES.map((choice) => ({
                  value: choice.value,
                  title: choice.label,
                }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {errors.statedBand ? (
            <span aria-live="polite" className="text-[13px] font-semibold text-error">
              {errors.statedBand.message}
            </span>
          ) : (
            <span className="text-xs font-normal text-fg2">{LEVEL_HINT}</span>
          )}
        </div>
        <Notice tone="info">{REQUEST_NOTE}</Notice>
        <div className="flex flex-wrap justify-end gap-2.5 max-sm:grid max-sm:grid-cols-2 max-sm:[&>*]:w-full">
          <Button onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isPending}>
            Send request
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
