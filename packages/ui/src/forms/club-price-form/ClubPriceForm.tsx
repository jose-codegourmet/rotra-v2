'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@rotra/ui/button'
import { ClubPriceFields } from '@rotra/ui/forms/club-price-fields'
import { Notice } from '@rotra/ui/notice'
import { useId } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { clubPriceDefaultValues } from './ClubPriceForm.defaultValues'
import {
  type ClubPriceFormInput,
  type ClubPriceFormValues,
  clubPriceFormSchema,
} from './ClubPriceForm.schema'

export type ClubPriceFormProps = {
  /** The club's current price as one line, e.g. clubPriceLine() → "₱1,500 a month · ₱15,000 a year (17% off)" */
  currentPriceLine: string
  /** The club's price (clubPriceInputFrom); a free club keeps its last paid amounts for Paid */
  defaultValues?: ClubPriceFormInput
  onSubmit: (values: ClubPriceFormValues) => void
  onCancel: () => void
  /** Saving: "Saving…", and Cancel and Save price cannot be pressed */
  isPending?: boolean
  /** Why saving failed; nothing changed and the typed values are kept */
  serverError?: string
}

/**
 * A-CLUB-PRICE: the Change price sheet body. Shows the current price, the Paid/Free price fields and
 * that only later payments use the new price. Save price submits to the container; it never saves.
 */
export function ClubPriceForm({
  currentPriceLine,
  defaultValues = clubPriceDefaultValues,
  onSubmit,
  onCancel,
  isPending = false,
  serverError,
}: ClubPriceFormProps) {
  const formId = useId()
  const form = useForm<ClubPriceFormInput, unknown, ClubPriceFormValues>({
    resolver: zodResolver(clubPriceFormSchema),
    defaultValues,
  })

  return (
    <div className="flex flex-col gap-3.5">
      <p className="m-0 text-xs text-fg2">Now: {currentPriceLine}</p>
      <FormProvider {...form}>
        <form
          id={formId}
          noValidate
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit((values) => {
            if (!isPending) onSubmit(values)
          })}
        >
          <ClubPriceFields disabled={isPending} />
        </form>
      </FormProvider>
      <Notice>
        The new price fills in the amount for licenses you record from now on. Payments already
        recorded keep their amounts.
      </Notice>
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
          {isPending ? 'Saving…' : 'Save price'}
        </Button>
      </div>
    </div>
  )
}
