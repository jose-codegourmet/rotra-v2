import { clubs } from '@rotra/data/fixtures/clubs'
import { foundingCities } from '@rotra/data/fixtures/founding-cities'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { AddClubForm } from './AddClubForm'
import type { AddClubFormInput } from './AddClubForm.schema'

const filled: Partial<AddClubFormInput> = {
  name: 'Banilad Smash Club',
  foundingAddress: 'Gov. M. Cuenco Ave, Banilad, Cebu City',
  cityCode: 'PH-CEB',
  username: 'banilad.smash',
  password: 'k7mPq2xRw9Ht',
  price: { pricing: 'paid', monthly: '1500', yearly: '15000' },
}

const meta = {
  title: 'Admin/AddClubForm',
  component: AddClubForm,
  args: {
    cities: foundingCities,
    takenNames: clubs.map((club) => club.name),
    takenUsernames: clubs.map((club) => club.username),
    onSubmit: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof AddClubForm>

export default meta
type Story = StoryObj<typeof meta>

const review: Story['play'] = async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole('button', { name: 'Review' }))
}

export const Empty: Story = {}
export const Filled: Story = { args: { defaultValues: filled } }
/** Review with nothing filled in: every required message. */
export const Errors: Story = { play: review }
/** Too long a name, a username with capitals and spaces, a short password, no yearly discount. */
export const InvalidValues: Story = {
  args: {
    defaultValues: {
      ...filled,
      name: 'Banilad Smash Club of Gov. M. Cuenco Avenue and the Northern Barangays',
      username: 'Banilad Smash',
      password: 'short',
      price: { pricing: 'paid', monthly: '1500', yearly: '18000' },
    },
  },
  play: review,
}
/** Matches "Lahug Smash Club" ignoring the accent. */
export const NameTaken: Story = {
  args: { defaultValues: { ...filled, name: 'Lahúg Smash Club', username: 'lahug.smashers' } },
  play: review,
}
export const UsernameTaken: Story = {
  args: { defaultValues: { ...filled, name: 'Lahug Smashers', username: 'lahug.smash' } },
  play: review,
}
/** Switch to Paid to see the typed amounts kept. */
export const Free: Story = {
  args: {
    defaultValues: { ...filled, price: { pricing: 'free', monthly: '1500', yearly: '15000' } },
  },
}
export const PasswordShown: Story = {
  args: { defaultValues: { ...filled, password: '' } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Generate a password' }))
  },
}
export const Pending: Story = { args: { defaultValues: filled, isPending: true } }
export const ServerError: Story = {
  args: {
    defaultValues: filled,
    serverError: "You're offline, so nothing was saved. Try again once you're connected.",
  },
}
export const Phone: Story = {
  args: { defaultValues: filled },
  globals: { viewport: { value: 'phone' } },
}
export const PhoneErrors: Story = { ...Errors, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = {
  args: { defaultValues: filled },
  globals: { viewport: { value: 'desktop' } },
}
export const EmptyLight: Story = { globals: { theme: 'light' } }
export const FilledLight: Story = { ...Filled, globals: { theme: 'light' } }
export const ErrorsLight: Story = { ...Errors, globals: { theme: 'light' } }
export const UsernameTakenLight: Story = { ...UsernameTaken, globals: { theme: 'light' } }
