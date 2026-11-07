'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ClubPlayerDetails } from '@rotra/data/club-player/types'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { PersonalDetailsFields } from '@rotra/ui/personal-details-fields'
import { PhoneOrEmailInput } from '@rotra/ui/phone-or-email-input'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { useEffect, useId } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { editPlayerDetailsDefaultValues } from './EditPlayerDetailsForm.defaultValues'
import {
  type EditPlayerDetailsValues,
  editPlayerDetailsSchema,
} from './EditPlayerDetailsForm.schema'

export type EditPlayerDetailsFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  details: ClubPlayerDetails
  onSubmit: (values: EditPlayerDetailsValues) => void
  isPending?: boolean
  /** A field problem shows under that field; anything else as a notice at the top */
  serverError?: { message: string; field?: 'fullName' | 'phone' | 'email' }
}

/**
 * Q-SAVED-PLAYERS › Edit details for a guest or unclaimed profile. The club fills in what it knows so
 * the player's registration starts prefilled. A phone on file is shown, never edited.
 */
export function EditPlayerDetailsForm({
  open,
  onOpenChange,
  details,
  onSubmit,
  isPending = false,
  serverError,
}: EditPlayerDetailsFormProps) {
  const formId = useId()
  const form = useForm<EditPlayerDetailsValues>({
    resolver: zodResolver(editPlayerDetailsSchema),
    defaultValues: editPlayerDetailsDefaultValues(details),
  })
  const errors = form.formState.errors
  const claim = details.identity === 'unclaimed'
  useEffect(() => {
    if (serverError?.field)
      form.setError(serverError.field, { type: 'server', message: serverError.message })
  }, [serverError, form])
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && isPending) return
        onOpenChange(next)
      }}
      title={`Edit ${details.fullName}`}
      dismissible={!isPending}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={isPending}>
            Save details
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form
          id={formId}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {serverError && !serverError.field ? (
            <Notice tone="error">{serverError.message}</Notice>
          ) : null}
          {claim ? (
            <Notice>
              What you fill in here is filled in for them when they open their invite link. They can
              still change it and only need to choose a password.
            </Notice>
          ) : null}
          <PersonalDetailsFields sections={['name']} disabled={isPending} />
          {details.phoneOnFile ? (
            <Field label="Phone">
              <p className="m-0 text-sm">
                On file and kept private. Not their number? Ask ROTRA to change it.
              </p>
            </Field>
          ) : (
            <Field
              label="Phone (optional)"
              error={errors.phone?.message}
              hint={
                errors.phone
                  ? undefined
                  : claim
                    ? 'This profile has no phone yet. They need one to register.'
                    : 'With a phone, ROTRA can match or create their profile when it syncs.'
              }
            >
              <Controller
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <PhoneOrEmailInput
                    {...field}
                    mode="phone"
                    placeholder="0917 555 0142"
                    disabled={isPending}
                  />
                )}
              />
            </Field>
          )}
          {claim ? (
            <>
              <Field
                label="Email (optional)"
                error={errors.email?.message}
                hint={
                  errors.email ? undefined : 'Fills in their registration. Never shown publicly.'
                }
              >
                <Controller
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <TextInput
                      {...field}
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="name@example.com"
                      disabled={isPending}
                    />
                  )}
                />
              </Field>
              <PersonalDetailsFields sections={['playing-style', 'links']} disabled={isPending} />
            </>
          ) : null}
        </form>
      </FormProvider>
    </Sheet>
  )
}
