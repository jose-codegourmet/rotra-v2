import { clubs } from '@rotra/data/fixtures/clubs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ClubPriceCard } from './ClubPriceCard'

const lahug = clubs.find((club) => club.username === 'lahug.smash')
const tagbilaran = clubs.find((club) => club.username === 'tagbilaran.circle')
if (!lahug || !tagbilaran) throw new Error('Club price fixtures missing')

// rotra-admin.html savePct(): story display only; the club detail screen owns the real number.
const savePct = (monthlyMinor: number, yearlyMinor: number) =>
  Math.round((1 - yearlyMinor / (monthlyMinor * 12)) * 100)

const meta = {
  title: 'Admin/ClubPriceCard',
  component: ClubPriceCard,
  args: {
    pricing: lahug.licensePricing,
    monthlyMinor: lahug.licenseMonthlyMinor,
    yearlyMinor: lahug.licenseYearlyMinor,
    yearlySavingPercent: savePct(lahug.licenseMonthlyMinor, lahug.licenseYearlyMinor),
    onChangePrice: fn(),
  },
} satisfies Meta<typeof ClubPriceCard>

export default meta
type Story = StoryObj<typeof meta>

export const Paid: Story = {}
export const NoDiscount: Story = {
  args: { yearlyMinor: lahug.licenseMonthlyMinor * 12, yearlySavingPercent: 0 },
}
export const Free: Story = {
  args: {
    pricing: tagbilaran.licensePricing,
    monthlyMinor: tagbilaran.licenseMonthlyMinor,
    yearlyMinor: tagbilaran.licenseYearlyMinor,
    yearlySavingPercent: 0,
  },
}
export const ReadOnly: Story = { args: { onChangePrice: undefined } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const PaidLight: Story = { globals: { theme: 'light' } }
export const NoDiscountLight: Story = { ...NoDiscount, globals: { theme: 'light' } }
export const FreeLight: Story = { ...Free, globals: { theme: 'light' } }
