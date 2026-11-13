'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { COURT_LABEL_MAX } from '@rotra/schema/court-label'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { type RefObject, useId, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { courtLabelDefaultValues } from './CourtLabelForm.defaultValues'
import {
  type CourtLabelFormInput,
  type CourtLabelFormValues,
  makeCourtLabelSchema,
} from './CourtLabelForm.schema'

export type CourtLabelFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The court's label now: the title ("Change Court 1 label?") and the field's prefill */
  currentLabel: string
  /** The session's other courts' labels: a new label must differ from each (any case) */
  otherLabels: string[]
  /** Receives the trimmed new label; the container saves it and toasts "OLD is now NEW" */
  onSubmit: (values: CourtLabelFormValues) => void
  /** Saving: nothing can be pressed and the sheet stays open */
  isPending?: boolean
  /** Why saving failed; the typed label stays */
  serverError?: string
  returnFocusRef?: RefObject<HTMLElement | null>
}

/**
 * Change court label (the prototype's SHEETS.courtLabel): a small dialog "Change COURT label?" with
 * one Court label field, the hint that it shows everywhere after sync, and Cancel / Save label.
 * Only the label changes; matches, start and end times stay as they are.
 */
export function CourtLabelForm({
  open,
  onOpenChange,
  currentLabel,
  otherLabels,
  onSubmit,
  isPending = false,
  serverError,
  returnFocusRef,
}: CourtLabelFormProps) {
  const formId = useId()
  const schema = useMemo(() => makeCourtLabelSchema(otherLabels), [otherLabels])
  const form = useForm<CourtLabelFormInput, unknown, CourtLabelFormValues>({
    resolver: zodResolver(schema),
    defaultValues: courtLabelDefaultValues(currentLabel),
  })
  const error = form.formState.errors.label?.message

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title={`Change ${currentLabel} label?`}
      dismissible={!isPending}
      returnFocusRef={returnFocusRef}
      footer={
        <>
          <Button disabled={isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={isPending}>
            Save label
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="flex flex-col gap-3.5"
        onSubmit={form.handleSubmit((values) => {
          if (!isPending) onSubmit(values)
        })}
      >
        {serverError ? <Notice tone="error">{serverError}</Notice> : null}
        <Field
          label="Court label"
          error={error}
          hint={
            error
              ? undefined
              : 'Shows on the console, the public page and match history after sync.'
          }
        >
          <Controller
            control={form.control}
            name="label"
            render={({ field }) => (
              <TextInput
                {...field}
                disabled={isPending}
                maxLength={COURT_LABEL_MAX}
                placeholder="e.g. Court A, Center Court"
                autoComplete="off"
                autoFocus
              />
            )}
          />
        </Field>
      </form>
    </Sheet>
  )
}
