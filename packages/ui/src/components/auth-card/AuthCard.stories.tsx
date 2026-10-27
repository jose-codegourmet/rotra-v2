import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { TextInput } from '@rotra/ui/text-input'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AuthCard } from './AuthCard'

// Copy from each prototype's sign-in screen. The forms here are placeholders: each product builds its own.
function QueueForm({ disabled }: { disabled?: boolean }) {
  return (
    <form className="flex flex-col gap-[18px]" onSubmit={(e) => e.preventDefault()}>
      <Field label="Username" hint="Your club account username, not a player phone or email.">
        <TextInput autoComplete="username" />
      </Field>
      <Field label="Password">
        <TextInput type="password" autoComplete="current-password" />
      </Field>
      <Button type="submit" variant="primary" block disabled={disabled}>
        Sign in
      </Button>
    </form>
  )
}

const meta = {
  title: 'Shared/AuthCard',
  component: AuthCard,
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Club login',
    tagline: 'Run the game.',
    footer: 'Club access is set up and licensed by the ROTRA platform owner.',
    children: <QueueForm />,
  },
} satisfies Meta<typeof AuthCard>

export default meta
type Story = StoryObj<typeof meta>

export const Queue: Story = {}

export const Player: Story = {
  args: {
    title: 'Sign in',
    tagline: 'Your player profile.',
    footer:
      "New to ROTRA? A club adds you first, then sends you a link to finish registering. You don't need an account to view profiles or the leaderboard.",
  },
}

export const Admin: Story = {
  args: {
    title: 'Sign in',
    tagline: undefined,
    product: 'Admin',
    description:
      'Mock sign-in for this prototype. Any email and password work, and nothing is checked or sent.',
    footer: undefined,
  },
}

export const Offline: Story = { args: { offline: true, children: <QueueForm disabled /> } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
