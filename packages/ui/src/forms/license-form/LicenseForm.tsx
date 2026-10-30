'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { parseWholePesos } from '@rotra/schema/club-price'
import { dateField } from '@rotra/schema/date'
import { formatPeso } from '@rotra/schema/money'
import { Button } from '@rotra/ui/button'
import { ChoiceGroup } from '@rotra/ui/choice-group'
import { ClubLogo } from '@rotra/ui/club-logo'
import { DatePicker } from '@rotra/ui/date-picker'
import { Field } from '@rotra/ui/field'
import { PesoInput } from '@rotra/ui/forms/club-price-fields'
import { formatYmd } from '@rotra/ui/license-access-chip/variants'
import { Notice } from '@rotra/ui/notice'
import { SheetSteps } from '@rotra/ui/sheet-steps'
import { TextInput } from '@rotra/ui/text-input'
import { useEffect, useId, useMemo } from 'react'
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'
import { licenseDefaultValues } from './LicenseForm.defaultValues'
import {
  createLicenseSchema,
  LICENSE_PLANS,
  type LicenseFormInput,
  type LicenseFormValues,
  type LicensePlan,
} from './LicenseForm.schema'

/** The club the license is for, as the sheet's header row shows it */
export type LicenseFormClub = {
  name: string
  initials: string
  logoUrl?: string | null
  /** The accent logo tone, as the club directory shows it */
  accent?: boolean
}

/** The club's own price for each plan, in centavos; a free club shows Free and records ₱0 */
export type LicenseFormPrices = {
  monthlyMinor: number
  yearlyMinor: number
  isFree: boolean
}

export type LicenseFormProps = {
  club: LicenseFormClub
  /** licenseStatusLine(access): "Active until Mar 31, 2027", "Expired since …", "Starts …", "Never licensed" */
  statusLine: string
  /** The club has an active term: shows the note that the suggested start is a placeholder rule */
  isActive?: boolean
  prices: LicenseFormPrices
  /** Values to start from (the prototype's licStart), or everything kept when coming Back from review */
  defaultValues?: Partial<LicenseFormInput>
  /** The term's last day 'YYYY-MM-DD' for a start date and plan, from the @rotra/data license rules */
  getTermEnd: (startsOn: string, plan: LicensePlan) => string
  /** 'YYYY-MM-DD'; the payment date can't be after it. Defaults to today in Manila */
  today?: string
  /** Review: the values passed every check; the container shows LicenseReview */
  onSubmit: (values: LicenseFormValues) => void
  onCancel: () => void
  /** Accepted for symmetry with the review step; Review is disabled while it is true */
  isPending?: boolean
  serverError?: string
  /** True while a field differs from defaultValues, so the container can ask before discarding */
  onDirtyChange?: (dirty: boolean) => void
}

const STEPS = ['Details', 'Review']
const FIELD_GRID = 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5'
const LABEL = 'text-[13px] font-semibold text-fg2'

const manilaToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())

const isPlan = (value: string): value is LicensePlan =>
  (LICENSE_PLANS as readonly string[]).includes(value)

/**
 * A-LICENSE step 1: record an activation or renewal the club paid for outside ROTRA. Plan, term start
 * (with its end as a hint), and for a paid club the date paid and amount; a free club shows Amount:
 * Free. Review submits to the container, which shows LicenseReview. It never saves anything.
 */
export function LicenseForm({
  club,
  statusLine,
  isActive = false,
  prices,
  defaultValues,
  getTermEnd,
  today: todayProp,
  onSubmit,
  onCancel,
  isPending = false,
  serverError,
  onDirtyChange,
}: LicenseFormProps) {
  const formId = useId()
  const today = todayProp ?? manilaToday()
  const schema = useMemo(
    () => createLicenseSchema({ isFree: prices.isFree, today }),
    [prices.isFree, today],
  )
  const form = useForm<LicenseFormInput, unknown, LicenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...licenseDefaultValues, ...defaultValues },
  })
  const { errors, isSubmitted, isDirty } = form.formState
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])
  const [plan, startsOn] = useWatch({ control: form.control, name: ['plan', 'startsOn'] })
  const termEnd =
    isPlan(plan) && dateField.safeParse(startsOn).success ? getTermEnd(startsOn, plan) : null

  const priceFor = (value: string) =>
    value === 'Yearly' ? prices.yearlyMinor : value === 'Monthly' ? prices.monthlyMinor : null
  const planPrice = (minor: number) => (prices.isFree ? 'Free' : formatPeso(minor))

  // rotra-admin.html licPlan: switching plans fills in that plan's price, unless the amount was
  // typed in by hand (it no longer matches the previous plan's price).
  const choosePlan = (next: string) => {
    if (!prices.isFree) {
      const amount = form.getValues('amount')
      const nextPrice = priceFor(next)
      if (nextPrice !== null && (!amount.trim() || parseWholePesos(amount) === priceFor(plan)))
        form.setValue('amount', String(nextPrice / 100), {
          shouldDirty: true,
          shouldValidate: isSubmitted,
        })
    }
    form.setValue('plan', next, { shouldDirty: true, shouldValidate: isSubmitted })
  }

  return (
    <div className="flex flex-col gap-3.5">
      <SheetSteps steps={STEPS} current={0} />
      <div className="flex min-w-0 items-center gap-3">
        <ClubLogo
          initials={club.initials}
          logoUrl={club.logoUrl}
          tone={club.accent ? 'accent' : 'default'}
        />
        <div className="flex min-w-0 flex-col gap-px">
          <b className="truncate">{club.name}</b>
          <span className="text-xs text-fg2">{statusLine}</span>
        </div>
      </div>
      <FormProvider {...form}>
        <form
          id={formId}
          noValidate
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit((values) => {
            if (!isPending) onSubmit(values)
          })}
        >
          {serverError ? <Notice tone="error">{serverError}</Notice> : null}
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className={LABEL}>Plan</span>
            <ChoiceGroup
              type="single"
              aria-label="Plan"
              choices={[
                {
                  value: 'Monthly',
                  title: 'Monthly',
                  description: `${planPrice(prices.monthlyMinor)} for one month`,
                },
                {
                  value: 'Yearly',
                  title: 'Yearly',
                  description: `${planPrice(prices.yearlyMinor)} for one year`,
                },
              ]}
              value={plan}
              onChange={(value) => {
                // Radix reports '' when the chosen card is pressed again; keep the plan.
                if (value) choosePlan(value)
              }}
            />
            {errors.plan ? (
              <span role="alert" className="text-[13px] font-semibold text-error">
                {errors.plan.message}
              </span>
            ) : null}
          </div>
          <div className={FIELD_GRID}>
            <Field
              label="Term starts"
              hint={termEnd ? `Ends ${formatYmd(termEnd)}` : undefined}
              error={errors.startsOn?.message}
            >
              <Controller
                control={form.control}
                name="startsOn"
                render={({ field }) => (
                  <DatePicker
                    ref={field.ref}
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    invalid={Boolean(errors.startsOn)}
                  />
                )}
              />
            </Field>
            {prices.isFree ? (
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className={LABEL}>Amount</span>
                <b>Free</b>
                <span className="text-xs text-fg2">
                  This is a tester club, so nothing is charged. Change it from the club's Price
                  card.
                </span>
              </div>
            ) : (
              <>
                <Field label="Paid on" error={errors.paidOn?.message}>
                  <Controller
                    control={form.control}
                    name="paidOn"
                    render={({ field }) => (
                      <DatePicker
                        ref={field.ref}
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        max={today}
                        invalid={Boolean(errors.paidOn)}
                      />
                    )}
                  />
                </Field>
                <Field
                  label="Amount paid"
                  hint="Filled in from this club's price. Change it if the club paid a different amount."
                  error={errors.amount?.message}
                >
                  <Controller
                    control={form.control}
                    name="amount"
                    render={({ field }) => <PesoInput {...field} />}
                  />
                </Field>
              </>
            )}
            <Field label="Reference" optional error={errors.reference?.message}>
              <Controller
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <TextInput
                    {...field}
                    placeholder="Receipt or transfer reference"
                    autoComplete="off"
                  />
                )}
              />
            </Field>
          </div>
          {isActive ? (
            <Notice>
              The start date is suggested as the day after the current term ends. The rule for
              renewing early hasn't been decided, so check it before you continue.
            </Notice>
          ) : null}
        </form>
      </FormProvider>
      <div className="flex flex-wrap justify-end gap-2.5 [&>*]:flex-auto">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" form={formId} variant="primary" disabled={isPending}>
          Review
        </Button>
      </div>
    </div>
  )
}
