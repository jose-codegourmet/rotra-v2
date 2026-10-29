import { clubs } from '@rotra/data/fixtures/clubs'
import { clubPriceInputFrom, clubPriceLine } from '@rotra/ui/forms/club-price-fields/helpers'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ClubPriceForm } from './ClubPriceForm'

function priceOf(username: string) {
  const club = clubs.find((row) => row.username === username)
  if (!club) throw new Error(`Club fixture missing: ${username}`)
  const stored = {
    pricing: club.licensePricing,
    monthlyMinor: club.licenseMonthlyMinor,
    yearlyMinor: club.licenseYearlyMinor,
  }
  return {
    currentPriceLine: clubPriceLine(
      stored.pricing === 'free'
        ? { pricing: 'free', monthly: null, yearly: null }
        : { pricing: 'paid', monthly: stored.monthlyMinor, yearly: stored.yearlyMinor },
    ),
    defaultValues: { price: clubPriceInputFrom(stored) },
  }
}

const lahug = priceOf('lahug.smash')
/** The tester club: switching to Paid starts from its last paid ₱1,000 / ₱10,000. */
const tagbilaran = priceOf('tagbilaran.circle')

const meta = {
  title: 'Admin/ClubPriceForm',
  component: ClubPriceForm,
  args: { ...lahug, onSubmit: fn(), onCancel: fn() },
} satisfies Meta<typeof ClubPriceForm>

export default meta
type Story = StoryObj<typeof meta>

const save: Story['play'] = async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole('button', { name: 'Save price' }))
}

export const Paid: Story = {}
export const Free: Story = { args: tagbilaran }
/** Save price with both amounts cleared. */
export const Errors: Story = {
  name: 'Error',
  args: { defaultValues: { price: { pricing: 'paid', monthly: '', yearly: '' } } },
  play: save,
}
/** A yearly price of twelve months at the monthly price gets no discount. */
export const NoDiscountError: Story = {
  args: { defaultValues: { price: { pricing: 'paid', monthly: '1500', yearly: '18000' } } },
  play: save,
}
export const Pending: Story = { args: { isPending: true } }
export const ServerError: Story = {
  args: { serverError: "You're offline, so nothing was saved. Try again once you're connected." },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const PaidLight: Story = { globals: { theme: 'light' } }
export const FreeLight: Story = { ...Free, globals: { theme: 'light' } }
export const ErrorsLight: Story = { ...Errors, name: 'Error Light', globals: { theme: 'light' } }
