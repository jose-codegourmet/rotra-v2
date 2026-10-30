import { zodResolver } from '@hookform/resolvers/zod'
import { clubs } from '@rotra/data/fixtures/clubs'
import { type ClubPriceValues, clubPriceField } from '@rotra/schema/club-price'
import { Button } from '@rotra/ui/button'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { fn } from 'storybook/test'
import { z } from 'zod'
import {
  ClubPriceFields,
  type ClubPriceFieldsProps,
  type ClubPriceFormShape,
} from './ClubPriceFields'

const lahug = clubs.find((club) => club.username === 'lahug.smash')
if (!lahug) throw new Error('Club price fixtures missing')
const pesos = (minor: number) => String(minor / 100)

const schema = z.object({ price: clubPriceField })

function Example({
  price,
  validate,
  ...args
}: ClubPriceFieldsProps & { price?: ClubPriceFormShape['price']; validate?: boolean }) {
  const form = useForm<ClubPriceFormShape, unknown, { price: ClubPriceValues }>({
    resolver: zodResolver(schema),
    defaultValues: { price: price ?? { pricing: 'paid', monthly: '', yearly: '' } },
  })
  useEffect(() => {
    if (validate) void form.trigger()
  }, [validate, form])
  return (
    <FormProvider {...form}>
      <form className="flex max-w-[560px] flex-col gap-4" onSubmit={form.handleSubmit(fn())}>
        <ClubPriceFields {...args} />
        <Button type="submit">Check fields</Button>
      </form>
    </FormProvider>
  )
}

const paidPrice = {
  pricing: 'paid',
  monthly: pesos(lahug.licenseMonthlyMinor),
  yearly: pesos(lahug.licenseYearlyMinor),
} as const

const meta = {
  title: 'Admin/ClubPriceFields',
  component: Example,
} satisfies Meta<typeof Example>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}
export const Paid: Story = { args: { price: paidPrice } }
/** Switch to Paid to see the kept amounts come back. */
export const Free: Story = { args: { price: { ...paidPrice, pricing: 'free' } } }
export const MissingAmounts: Story = { args: { validate: true } }
export const NoDiscountError: Story = {
  args: { price: { ...paidPrice, yearly: pesos(lahug.licenseMonthlyMinor * 12) }, validate: true },
}
export const Disabled: Story = { args: { price: paidPrice, disabled: true } }
export const Phone: Story = {
  args: { price: paidPrice },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = {
  args: { price: paidPrice },
  globals: { viewport: { value: 'desktop' } },
}
export const PaidLight: Story = { ...Paid, globals: { theme: 'light' } }
export const FreeLight: Story = { ...Free, globals: { theme: 'light' } }
export const NoDiscountErrorLight: Story = { ...NoDiscountError, globals: { theme: 'light' } }
