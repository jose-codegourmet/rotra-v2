'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { PlayingLevel } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { LevelSelect } from '@rotra/ui/level-select'
import { Notice } from '@rotra/ui/notice'
import { TextInput } from '@rotra/ui/text-input'
import { useId } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { newPlayerFormDefaultValues } from './NewPlayerForm.defaultValues'
import {
  NICKNAME_MAX,
  type NewPlayerFormInput,
  type NewPlayerFormValues,
  newPlayerSchema,
} from './NewPlayerForm.schema'

export type NewPlayerFormProps = {
  onSubmit: (values: NewPlayerFormValues) => void
  /** The add is running: submit is disabled so one tap cannot add twice */
  isPending?: boolean
  /** Why the add failed; what was typed stays in the fields */
  serverError?: string
  /** The session is live: the level label says it locks immediately */
  live?: boolean
  /** Every slot is taken: the submit reads "Add to waitlist" */
  full?: boolean
  /** Puts the cursor in the name field on mount (the Add player sheet does this after each add) */
  autoFocus?: boolean
  /** Form id, so a button outside the form (the sheet footer) can submit it with form={id} */
  id?: string
  /** Leave the submit button out; the container renders its own with type="submit" form={id} */
  hideSubmit?: boolean
  defaultValues?: Partial<NewPlayerFormInput>
}

export const PHONE_HINT =
  "Without a phone they're saved as a guest. With one, ROTRA can match or create their profile when the session syncs."

/** The submit label the prototype uses: a slot when one is open, otherwise the waitlist. */
export function addPlayerSubmitLabel(full: boolean | undefined) {
  return full ? 'Add to waitlist' : 'Confirm player slot'
}

/**
 * Q-ADD-PLAYER › New player tab: name, optional nickname and phone, and the level for this club.
 * Works offline; the container owns the add mutation and its toasts.
 */
export function NewPlayerForm({
  onSubmit,
  isPending = false,
  serverError,
  live = false,
  full = false,
  autoFocus,
  id,
  hideSubmit = false,
  defaultValues,
}: NewPlayerFormProps) {
  const autoId = useId()
  const formId = id ?? `new-player${autoId}`
  const form = useForm<NewPlayerFormInput, unknown, NewPlayerFormValues>({
    resolver: zodResolver(newPlayerSchema),
    defaultValues: { ...newPlayerFormDefaultValues, ...defaultValues },
  })
  const { errors } = form.formState

  return (
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
        <Field label="Full or display name" error={errors.name?.message}>
          <Controller
            control={form.control}
            name="name"
            render={({ field }) => (
              <TextInput {...field} autoComplete="off" autoFocus={autoFocus} />
            )}
          />
        </Field>
        <Field label="Nickname" optional error={errors.nickname?.message}>
          <Controller
            control={form.control}
            name="nickname"
            render={({ field }) => (
              <TextInput {...field} maxLength={NICKNAME_MAX} autoComplete="off" />
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
              <TextInput {...field} type="tel" inputMode="tel" autoComplete="off" />
            )}
          />
        </Field>
        <Field
          label={`Level for this club${live ? ' (locks immediately)' : ''}`}
          error={errors.level?.message}
        >
          <Controller
            control={form.control}
            name="level"
            render={({ field }) => (
              <LevelSelect
                ref={field.ref}
                name={field.name}
                value={(field.value as PlayingLevel | '') || null}
                onChange={field.onChange}
                onBlur={field.onBlur}
                missing={Boolean(errors.level)}
              />
            )}
          />
        </Field>
        {hideSubmit ? null : (
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button type="submit" variant="primary" loading={isPending}>
              {addPlayerSubmitLabel(full)}
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  )
}
