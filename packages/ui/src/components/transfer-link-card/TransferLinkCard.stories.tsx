import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { TransferLinkCard } from './TransferLinkCard'

const meta = {
  title: 'Queue/TransferLinkCard',
  component: TransferLinkCard,
  args: {
    state: 'open',
    senderName: 'J*** L***',
    signedIn: false,
    registerHref: '#register',
    logInHref: '#login',
    onClaim: fn(),
    onWithdraw: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TransferLinkCard>
export default meta
type Story = StoryObj<typeof meta>

export const SignUpToClaim: Story = {}
export const ReadyToClaim: Story = { args: { signedIn: true } }
export const Claiming: Story = { args: { signedIn: true, pending: true } }
export const AlreadyHasSlot: Story = {
  args: {
    signedIn: true,
    claimBlock: "You already have a slot in this session, so you can't claim this one.",
  },
}
export const ClaimedByYou: Story = { args: { signedIn: true, state: 'yours' } }
export const Approved: Story = { args: { signedIn: true, state: 'approved' } }
export const ClaimedBySomeoneElse: Story = { args: { signedIn: true, state: 'claimed' } }
export const OwnLink: Story = { args: { signedIn: true, state: 'own' } }
export const NoLongerWorks: Story = { args: { state: 'closed', senderName: null } }
export const Expired: Story = { args: { state: 'expired' } }
export const SessionCancelled: Story = { args: { state: 'cancelled' } }
export const Offline: Story = { args: { signedIn: true, offline: true } }
export const SignUpToClaimLight: Story = { globals: { theme: 'light' } }
export const ClaimedByYouLight: Story = { ...ClaimedByYou, globals: { theme: 'light' } }
export const ClaimedBySomeoneElseLight: Story = {
  ...ClaimedBySomeoneElse,
  globals: { theme: 'light' },
}
