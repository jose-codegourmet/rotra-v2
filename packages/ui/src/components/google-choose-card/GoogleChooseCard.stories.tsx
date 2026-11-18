import type { Meta, StoryObj } from '@storybook/react-vite'
import { GoogleChooseCard } from './GoogleChooseCard'

const meta = {
  title: 'Player/GoogleChooseCard',
  component: GoogleChooseCard,
  args: {
    title: 'New to ROTRA?',
    onGoogle: () => {},
    onNoGoogle: () => {},
    hint: "ROTRA accounts sign in with Google. You don't need a password, and you add your mobile number next.",
    signIn: { label: 'Sign in to join', onClick: () => {} },
  },
} satisfies Meta<typeof GoogleChooseCard>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Pending: Story = { args: { pending: true } }
export const WithError: Story = {
  args: {
    error: 'dalton@example.com is already on another ROTRA account. Pick another Google account.',
  },
}
export const ClaimStep: Story = {
  args: {
    title: undefined,
    signIn: undefined,
    hint: 'Your Google email becomes your ROTRA email and is already confirmed.',
  },
}
export const DefaultLight: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
