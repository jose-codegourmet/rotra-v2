'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { useId, useMemo } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { venueFormDefaultValues } from './VenueForm.defaultValues'
import {
  VENUE_ADDRESS_MAX,
  VENUE_NAME_MAX,
  type VenueFormInput,
  type VenueFormValues,
  venueSchema,
} from './VenueForm.schema'

export type VenueFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "New venue" or "Edit venue" */
  mode: 'new' | 'edit'
  /** "Cancel" from the Venues page, "Back" from the venue picker */
  cancelLabel?: 'Cancel' | 'Back'
  onCancel?: () => void
  onSubmit: (values: VenueFormValues) => void
  isPending?: boolean
  /** e.g. the duplicate-name message from the server */
  serverError?: string
  /** The club's other venue names; a match (any case) is rejected */
  existingNames?: string[]
  /** Fees as peso text; use feeToInput() from the defaultValues file to convert saved centavos */
  defaultValues?: Partial<VenueFormInput>
}

const FEE_HINTS = {
  courtFee:
    'Fills in the Financials step when you pick this venue. You can still change it for each session.',
  entranceFee:
    "If this venue charges each player to get in. Picking the venue turns on the session's entrance fee with this amount; you can still change it.",
} as const

/** Q-VENUE form: add or edit a saved venue, in a sheet. Fees are optional and saved as centavos. */
export function VenueForm({
  open,
  onOpenChange,
  mode,
  cancelLabel = 'Cancel',
  onCancel,
  onSubmit,
  isPending = false,
  serverError,
  existingNames,
  defaultValues,
}: VenueFormProps) {
  const formId = useId()
  const schema = useMemo(() => venueSchema(existingNames), [existingNames])
  const form = useForm<VenueFormInput, unknown, VenueFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...venueFormDefaultValues, ...defaultValues },
  })
  const { errors } = form.formState

  const feeField = (name: 'courtFee' | 'entranceFee', label: string, placeholder: string) => (
    <Field
      label={label}
      optional
      hint={errors[name] ? undefined : FEE_HINTS[name]}
      error={errors[name]?.message}
    >
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <div className="flex items-center gap-1.5">
            <span aria-hidden className="font-bold text-fg2">
              ₱
            </span>
            <TextInput {...field} inputMode="decimal" placeholder={placeholder} />
          </div>
        )}
      />
    </Field>
  )

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title={mode === 'edit' ? 'Edit venue' : 'New venue'}
      dismissible={!isPending}
      footer={
        <>
          <Button disabled={isPending} onClick={onCancel ?? (() => onOpenChange(false))}>
            {cancelLabel}
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={isPending}>
            Save venue
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
          <Field label="Venue name" error={errors.name?.message}>
            <Controller
              control={form.control}
              name="name"
              render={({ field }) => (
                <TextInput {...field} maxLength={VENUE_NAME_MAX} autoComplete="off" />
              )}
            />
          </Field>
          <Field label="Address" optional error={errors.address?.message}>
            <Controller
              control={form.control}
              name="address"
              render={({ field }) => (
                <TextInput {...field} value={field.value ?? ''} maxLength={VENUE_ADDRESS_MAX} />
              )}
            />
          </Field>
          {feeField('courtFee', 'Court fee per hour, per court', '0')}
          {feeField('entranceFee', 'Entrance fee per head', 'No entrance fee')}
          <p className="m-0 text-[13px] text-fg2">
            Saved to your club's venues so you can pick it next time.
          </p>
        </form>
      </FormProvider>
    </Sheet>
  )
}
