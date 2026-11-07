'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { PaymentStatus } from '@rotra/data/session-payment/rules'
import { formatPeso, moneyField } from '@rotra/schema/money'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { PaymentStatusChip } from '@rotra/ui/payments-checklist/payment-status-chip'
import { TextInput } from '@rotra/ui/text-input'
import { useId } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { paymentAmountDefaultValues, pesoText } from './PaymentAmountForm.defaultValues'
import {
  type PaymentAmountFormInput,
  type PaymentAmountFormValues,
  paymentAmountFormSchema,
} from './PaymentAmountForm.schema'

export type PaymentAmountFormProps = {
  /** Today's amount due per player in centavos; null with no fee set */
  amountDue: number | null
  /** paymentAmountInputFrom(received, amountDue): the amount received so far, else the amount due */
  defaultValues?: PaymentAmountFormInput
  /**
   * The status a typed amount would save, from the container (statusForReceived in
   * @rotra/data/session-payment/rules); the form never does payment math itself.
   */
  previewStatus: (receivedMinor: number) => PaymentStatus
  /** Receives the amount received in centavos; 0 means not paid */
  onSubmit: (values: PaymentAmountFormValues) => void
  onCancel: () => void
  /** Saving: "Saving…", and nothing can be pressed */
  isPending?: boolean
  /** Why saving failed; the typed amount stays */
  serverError?: string
}

/**
 * Q-PAYMENTS · the "Payment from <name>" sheet body (#479): the amount due, the amount received with
 * Full and Clear shortcuts, and a live Paid / Partial / Reimburse / Unpaid preview. Save submits to
 * the container; it never saves.
 */
export function PaymentAmountForm({
  amountDue,
  defaultValues = paymentAmountDefaultValues,
  previewStatus,
  onSubmit,
  onCancel,
  isPending = false,
  serverError,
}: PaymentAmountFormProps) {
  const formId = useId()
  const form = useForm<PaymentAmountFormInput, unknown, PaymentAmountFormValues>({
    resolver: zodResolver(paymentAmountFormSchema),
    defaultValues,
  })
  const typed = useWatch({ control: form.control, name: 'amount' })
  const parsed = moneyField.safeParse(typed?.trim())
  const set = (minor: number) =>
    form.setValue('amount', pesoText(minor), { shouldDirty: true, shouldValidate: true })

  return (
    <div className="flex flex-col gap-3.5">
      <p className="m-0 text-sm text-fg2">
        {amountDue === null
          ? 'No fee set for this session.'
          : `Amount due: ${formatPeso(amountDue)}`}
      </p>
      <form
        id={formId}
        noValidate
        className="flex flex-col gap-3"
        onSubmit={form.handleSubmit((values) => {
          if (!isPending) onSubmit(values)
        })}
      >
        <Field label="Amount received" error={form.formState.errors.amount?.message}>
          <Controller
            control={form.control}
            name="amount"
            render={({ field }) => (
              <div className="flex max-w-60 items-center gap-2">
                <span aria-hidden>₱</span>
                <TextInput {...field} inputMode="decimal" placeholder="0" disabled={isPending} />
              </div>
            )}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          {amountDue !== null ? (
            <Button size="sm" disabled={isPending} onClick={() => set(amountDue)}>
              {`Full ${formatPeso(amountDue)}`}
            </Button>
          ) : null}
          <Button size="sm" disabled={isPending} onClick={() => set(0)}>
            Clear
          </Button>
        </div>
      </form>
      {parsed.success ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-fg2">
          Status: <PaymentStatusChip status={previewStatus(parsed.data)} />
        </div>
      ) : null}
      <p className="m-0 text-xs text-fg2">
        ROTRA only records it; money is collected outside the app.
      </p>
      {serverError ? (
        <p role="alert" className="m-0 text-[13px] font-semibold text-error">
          {serverError}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2.5 [&>*]:flex-auto">
        <Button disabled={isPending} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" form={formId} variant="primary" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
