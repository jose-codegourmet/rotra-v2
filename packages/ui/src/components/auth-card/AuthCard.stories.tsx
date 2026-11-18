import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { GoogleButton } from '@rotra/ui/google-button'
import { Notice } from '@rotra/ui/notice'
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

export const PlayerWithLegalNote: Story = {
  args: {
    ...Player.args,
    below: (
      <p className="m-0">
        By continuing you agree to the{' '}
        <a href="/terms" className="text-accent underline underline-offset-[3px]">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="text-accent underline underline-offset-[3px]">
          Privacy Policy
        </a>
        .
      </p>
    ),
  },
}

export const PlayerWithGoogle: Story = {
  args: {
    ...Player.args,
    google: <GoogleButton />,
  },
}

export const PlayerWithGoogleFromInvite: Story = {
  args: {
    ...Player.args,
    google: <GoogleButton />,
    contextNotice: <Notice>Sign in to join Lakeside Smashers.</Notice>,
  },
}

export const PlayerWithGoogleLight: Story = {
  args: { ...PlayerWithGoogle.args },
  globals: { theme: 'light' },
}

export const Offline: Story = { args: { offline: true, children: <QueueForm disabled /> } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
