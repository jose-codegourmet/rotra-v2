'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { formatPhoneForDisplay } from '@rotra/schema/phone'
import { Button } from '@rotra/ui/button'
import { REQUEST_FIELD_LABEL } from '@rotra/ui/contact-request-status/variants'
import { Field } from '@rotra/ui/field'
import { useSubmitOnce } from '@rotra/ui/hooks/use-submit-once'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Notice } from '@rotra/ui/notice'
import { PhoneOrEmailInput } from '@rotra/ui/phone-or-email-input'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { useEffect, useId, useMemo, useRef } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { contactChangeRequestDefaultValues } from './ContactChangeRequestForm.defaultValues'
import {
  type ContactChangeRequestInput,
  type ContactChangeRequestValues,
  makeContactChangeRequestSchema,
} from './ContactChangeRequestForm.schema'

export type ContactChangeRequestFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** E.164 */
  currentPhone: string
  currentEmail: string
  onSubmit: (values: ContactChangeRequestValues) => void
  onCancel?: () => void
  isPending?: boolean
  /** A field-level failure from the server, e.g. the value belongs to another profile */
  fieldError?: string
  /** Any other failure (offline); what was typed stays */
  serverError?: string
  defaultValues?: Partial<ContactChangeRequestInput>
}

/** P-CONTACT-REQUEST: the 'Request a contact change' sheet. No document upload or identity proof. */
export function ContactChangeRequestForm({
  open,
  onOpenChange,
  currentPhone,
  currentEmail,
  onSubmit,
  onCancel,
  isPending = false,
  fieldError,
  serverError,
  defaultValues,
}: ContactChangeRequestFormProps) {
  const formId = useId()
  const schema = useMemo(
    () => makeContactChangeRequestSchema({ currentPhone, currentEmail }),
    [currentPhone, currentEmail],
  )
  const form = useForm<ContactChangeRequestInput, unknown, ContactChangeRequestValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...contactChangeRequestDefaultValues, ...defaultValues },
  })
  const submitOnce = useSubmitOnce(isPending)
  const field = form.watch('field')
  const fieldWord = REQUEST_FIELD_LABEL[field].toLowerCase()
  const error = form.formState.errors.toValue?.message ?? fieldError

  // Each opening starts fresh, like the prototype's openRequest.
  const initial = useRef(defaultValues)
  initial.current = defaultValues
  useEffect(() => {
    if (open) form.reset({ ...contactChangeRequestDefaultValues, ...initial.current })
  }, [open, form])

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Request a contact change"
      footer={
        <>
          <Button onClick={onCancel ?? (() => onOpenChange(false))}>Cancel</Button>
          <Button type="submit" form={formId} variant="primary" disabled={isPending}>
            {isPending ? 'Sending…' : 'Send request'}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <div className="flex flex-col gap-4">
          <SegmentedControl
            aria-label="Detail to change"
            value={field}
            disabled={isPending}
            options={[
              { value: 'phone', label: REQUEST_FIELD_LABEL.phone },
              { value: 'email', label: REQUEST_FIELD_LABEL.email },
            ]}
            onChange={(next) => form.reset({ field: next as ContactChangeRequestInput['field'], toValue: '' })}
          />
          <KeyValueList
            items={[
              {
                label: 'Current',
                value: (
                  <span className="font-mono [overflow-wrap:anywhere]">
                    {field === 'phone' ? formatPhoneForDisplay(currentPhone) : currentEmail}
                  </span>
                ),
              },
            ]}
          />
          <form
            id={formId}
            noValidate
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit((values) => submitOnce(() => onSubmit(values)))}
          >
            {serverError ? <Notice tone="error">{serverError}</Notice> : null}
            <Field
              label={`New ${fieldWord}`}
              error={error}
              hint={field === 'phone' ? 'A Philippine mobile number, like 0917 555 0142.' : undefined}
            >
              <Controller
                key={field}
                control={form.control}
                name="toValue"
                render={({ field: input }) =>
                  field === 'phone' ? (
                    <PhoneOrEmailInput
                      {...input}
                      mode="phone"
                      type="tel"
                      autoComplete="tel"
                      disabled={isPending}
                    />
                  ) : (
                    <TextInput
                      {...input}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      disabled={isPending}
                    />
                  )
                }
              />
            </Field>
          </form>
          <Notice tone="warn">
            <b>Changes take effect only after Admin approval.</b> Until then you keep signing in with
            your current {fieldWord}. Your player ID and history don't change.
          </Notice>
        </div>
      </FormProvider>
    </Sheet>
  )
}
