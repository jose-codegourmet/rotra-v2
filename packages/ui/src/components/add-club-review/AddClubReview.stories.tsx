import { foundingCities } from '@rotra/data/fixtures/founding-cities'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { AddClubReview, type AddClubReviewValues } from './AddClubReview'

const cebu = foundingCities.find((city) => city.code === 'PH-CEB')
if (!cebu) throw new Error('Founding city fixtures missing')

const values: AddClubReviewValues = {
  name: 'Banilad Smash Club',
  foundingAddress: 'Gov. M. Cuenco Ave, Banilad, Cebu City',
  cityCode: cebu.code,
  username: 'banilad.smash',
  passwordLength: 12,
  price: { pricing: 'paid', monthly: 150000, yearly: 1500000 },
}

const meta = {
  title: 'Admin/AddClubReview',
  component: AddClubReview,
  args: { values, cityName: cebu.name, onBack: fn(), onCreate: fn() },
} satisfies Meta<typeof AddClubReview>

export default meta
type Story = StoryObj<typeof meta>

export const Paid: Story = {}
export const Free: Story = {
  args: { values: { ...values, price: { pricing: 'free', monthly: null, yearly: null } } },
}
export const Pending: Story = { args: { isPending: true } }
export const ServerError: Story = {
  args: { serverError: "You're offline, so nothing was saved. Try again once you're connected." },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const PaidLight: Story = { globals: { theme: 'light' } }
export const FreeLight: Story = { ...Free, globals: { theme: 'light' } }
export const ServerErrorLight: Story = { ...ServerError, globals: { theme: 'light' } }
