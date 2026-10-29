'use client'

import {
  type ClubPriceInput,
  parseWholePesos,
  yearlySavingPercent,
} from '@rotra/schema/club-price'
import { formatPeso } from '@rotra/schema/money'
import { type Choice, ChoiceGroup } from '@rotra/ui/choice-group'
import { Field } from '@rotra/ui/field'
import { TextInput, type TextInputProps } from '@rotra/ui/text-input'
import { Controller, useFormContext, useWatch } from 'react-hook-form'

/** The form shape these fields expect: the price sits under `price` (built from clubPriceField). */
export type ClubPriceFormShape = { price: ClubPriceInput }

export type ClubPriceFieldsProps = {
  disabled?: boolean
}

const PRICING_CHOICES: Choice[] = [
  { value: 'paid', title: 'Paid', description: 'Monthly and yearly price for this club' },
  { value: 'free', title: 'Free', description: 'For tester clubs. Licenses are recorded at ₱0.' },
]

/** The prototypes' .affix: a ₱ block joined to the left of the input. */
function PesoInput(props: TextInputProps) {
  return (
    <div className="flex items-stretch">
      <b
        aria-hidden="true"
        className="grid place-items-center rounded-l-md border border-r-0 border-border-strong bg-elev px-3 font-semibold text-fg2"
      >
        ₱
      </b>
      <TextInput {...props} inputMode="numeric" className="rounded-l-none" />
    </div>
  )
}

/** rotra-admin.html priceFields() hint: twelve months at the monthly price, and the yearly saving. */
function priceHint(monthly: string | undefined, yearly: string | undefined) {
  const monthlyMinor = parseWholePesos(monthly)
  if (monthlyMinor === null) return 'Each club has its own price. There is no fixed price.'
  const yearlyMinor = parseWholePesos(yearly)
  const twelve = monthlyMinor * 12
  const saving =
    yearlyMinor !== null && yearlyMinor < twelve
      ? ` This yearly price saves ${yearlySavingPercent(monthlyMinor, yearlyMinor)}%.`
      : ''
  return `Twelve months at the monthly price is ${formatPeso(twelve)}.${saving}`
}

/**
 * Paid/Free price fields for a club, inside the parent FormProvider (Add club, Change price). Switching
 * to Free and back keeps the typed paid amounts. It never creates a form or saves data.
 */
export function ClubPriceFields({ disabled }: ClubPriceFieldsProps) {
  const form = useFormContext<ClubPriceFormShape>()
  const price = useWatch({ control: form.control, name: 'price' })
  const errors = form.formState.errors.price

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Controller
        control={form.control}
        name="price.pricing"
        render={({ field }) => (
          <ChoiceGroup
            type="single"
            aria-label="Pricing"
            choices={PRICING_CHOICES}
            value={field.value}
            disabled={disabled}
            onChange={(value) => field.onChange(value)}
          />
        )}
      />
      {price?.pricing === 'free' ? null : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5">
            <Field label="Monthly price" error={errors?.monthly?.message}>
              <Controller
                control={form.control}
                name="price.monthly"
                render={({ field }) => (
                  <PesoInput {...field} value={field.value ?? ''} disabled={disabled} />
                )}
              />
            </Field>
            <Field label="Yearly price" error={errors?.yearly?.message}>
              <Controller
                control={form.control}
                name="price.yearly"
                render={({ field }) => (
                  <PesoInput {...field} value={field.value ?? ''} disabled={disabled} />
                )}
              />
            </Field>
          </div>
          <p className="m-0 text-xs text-fg2">{priceHint(price?.monthly, price?.yearly)}</p>
        </>
      )}
    </div>
  )
}
