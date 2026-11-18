'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { Field } from '@rotra/ui/field'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Textarea } from '@rotra/ui/textarea'
import {
  VerificationStatusChip,
  type VerificationStatusChipProps,
} from '@rotra/ui/verification-status-chip'
import { useEffect, useId } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { adminVerificationOverrideDefaultValues } from './AdminVerificationOverrideForm.defaultValues'
import {
  type AdminVerificationOverrideValues,
  adminVerificationOverrideSchema,
} from './AdminVerificationOverrideForm.schema'

export type AdminVerificationOverrideFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  playerName: string
  rtrId: string | null
  completedSteps: VerificationStatusChipProps['completedSteps']
  verifiedByAdmin: boolean
  onSubmit: (values: AdminVerificationOverrideValues) => void
  isPending?: boolean
  serverError?: string
}

/** Confirms a set or clear action and collects the reason stored in the record of actions. */
export function AdminVerificationOverrideForm({
  open,
  onOpenChange,
  playerName,
  rtrId,
  completedSteps,
  verifiedByAdmin,
  onSubmit,
  isPending,
  serverError,
}: AdminVerificationOverrideFormProps) {
  const formId = useId()
  const form = useForm<AdminVerificationOverrideValues>({
    defaultValues: adminVerificationOverrideDefaultValues,
    resolver: zodResolver(adminVerificationOverrideSchema),
  })
  const { reset } = form
  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const action = verifiedByAdmin ? 'Clear override' : 'Set Verified by Admin'
  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${action}?`}
      summary={
        <KeyValueList
          className="gap-y-2 max-[420px]:gap-y-0"
          items={[
            { label: 'Player', value: <b>{playerName}</b> },
            { label: 'RTR ID', value: <span className="font-mono">{rtrId ?? '—'}</span> },
            {
              label: 'Current status',
              value: (
                <VerificationStatusChip
                  completedSteps={completedSteps}
                  verifiedByAdmin={verifiedByAdmin}
                />
              ),
            },
            {
              label: 'After saving',
              value: (
                <VerificationStatusChip
                  completedSteps={completedSteps}
                  verifiedByAdmin={!verifiedByAdmin}
                />
              ),
            },
          ]}
        />
      }
      consequence={
        verifiedByAdmin
          ? 'ROTRA will determine verification from the three automatic checks.'
          : 'ROTRA will mark this account verified through Admin.'
      }
      confirmLabel={action}
      backLabel="Cancel"
      isPending={isPending}
      pendingLabel="Saving…"
      formId={formId}
    >
      <FormProvider {...form}>
        <form id={formId} noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <Controller
            control={form.control}
            name="reason"
            render={({ field, fieldState }) => (
              <Field
                label="Reason for the change"
                hint="Required. Saved in the record of actions."
                error={fieldState.error?.message}
              >
                <Textarea
                  {...field}
                  required
                  rows={3}
                  disabled={isPending}
                  invalid={fieldState.invalid}
                />
              </Field>
            )}
          />
        </form>
      </FormProvider>
      {serverError ? (
        <p className="m-0 font-semibold text-[13px] text-error" role="alert">
          {serverError}
        </p>
      ) : null}
    </ConfirmSheet>
  )
}
