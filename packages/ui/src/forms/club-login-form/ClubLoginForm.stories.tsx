import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ClubLoginForm } from './ClubLoginForm'

const meta = {
  title: 'Queue/ClubLoginForm',
  component: ClubLoginForm,
  parameters: { layout: 'fullscreen' },
  args: { onSubmit: fn() },
} satisfies Meta<typeof ClubLoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Pending: Story = {
  args: { isPending: true, defaultValues: { username: 'lahug.smash', password: 'secret' } },
}

/** Submit with the fields empty to see the single summary notice. */
export const ErrorMissingFields: Story = {
  name: 'Error (missing fields)',
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }))
  },
}

export const Offline: Story = {
  args: { offline: true, defaultValues: { username: 'lahug.smash' } },
}

export const LongUsername: Story = {
  args: { defaultValues: { username: 'lahug.smash.club.tuesday.and.sunday.night.queue.account' } },
  globals: { viewport: { value: 'phone' } },
}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
