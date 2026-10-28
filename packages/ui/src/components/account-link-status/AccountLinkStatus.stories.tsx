import { signInExamples } from '@rotra/data/fixtures/player-accounts'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AccountLinkStatus } from './AccountLinkStatus'

const meta = {
  title: 'Player/AccountLinkStatus',
  component: AccountLinkStatus,
  args: {
    variant: 'reset-sent',
    email: signInExamples.email,
    onBackToSignIn: () => {},
    onRequestAnother: () => {},
  },
} satisfies Meta<typeof AccountLinkStatus>
export default meta
type Story = StoryObj<typeof meta>
export const ResetSent: Story = {}
export const ResetInvalid: Story = { args: { variant: 'reset-invalid' } }
