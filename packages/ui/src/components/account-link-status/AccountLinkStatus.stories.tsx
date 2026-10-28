import { claimLinkScenarios, signInExamples } from '@rotra/data/fixtures/player-accounts'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { AccountLinkStatus } from './AccountLinkStatus'

const meta = {
  title: 'Player/AccountLinkStatus',
  component: AccountLinkStatus,
  args: {
    variant: 'reset-sent',
    email: signInExamples.email,
    clubName: claimLinkScenarios.clubName,
    firstName: claimLinkScenarios.firstName,
    rtrId: claimLinkScenarios.rtrId,
    onBackToSignIn: fn(),
    onRequestAnother: fn(),
    onSignIn: fn(),
    onResetByEmail: fn(),
    onThisIsMe: fn(),
    onCheckAgain: fn(),
    onOpenProfile: fn(),
  },
} satisfies Meta<typeof AccountLinkStatus>
export default meta
type Story = StoryObj<typeof meta>
export const ResetSent: Story = {}
export const ResetInvalid: Story = { args: { variant: 'reset-invalid' } }
export const ClaimClaimed: Story = { args: { variant: 'claim-claimed' } }
export const ClaimExpired: Story = { args: { variant: 'claim-expired' } }
export const ClaimWrong: Story = { args: { variant: 'claim-wrong' } }
export const ClaimProcessing: Story = { args: { variant: 'claim-processing' } }
export const ClaimProcessingChecking: Story = {
  args: { variant: 'claim-processing', isPending: true },
}
export const ClaimDone: Story = { args: { variant: 'claim-done' } }
export const LongClubName: Story = {
  args: { variant: 'claim-wrong', clubName: claimLinkScenarios.longClubName },
}
export const Phone: Story = {
  args: { variant: 'claim-claimed' },
  globals: { viewport: { value: 'phone' } },
}
