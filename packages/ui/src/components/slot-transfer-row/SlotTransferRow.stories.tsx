import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SlotTransferRow } from './SlotTransferRow'

const meta = {
  title: 'Queue/SlotTransferRow',
  component: SlotTransferRow,
  args: {
    senderName: 'Jasper Lim',
    recipientName: 'Russel Tan',
    recipientRtrId: 'RTR-PH-CEB-102926-0014',
    timeLabel: '7:20 PM',
    suggestedLevel: 'intermediate_mid',
    payment: { amountDueMinor: 90000, paidMinor: 50000, priorWaivedMinor: 0, waivedMinor: 40000 },
    onApprove: fn(),
    onReject: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SlotTransferRow>
export default meta
type Story = StoryObj<typeof meta>

export const NotInSession: Story = {}
export const FromWaitlist: Story = { args: { recipientWaitlistPosition: 2 } }
export const NoLevelYet: Story = { args: { suggestedLevel: null } }
export const Pending: Story = { args: { isPending: true } }
export const LongNames: Story = {
  args: {
    senderName: 'Maria Consolacion Villanueva Bautista de la Cruz',
    recipientName: 'Juan Miguel Fernando Castillo Domingo',
  },
}
export const ErrorState: Story = {
  name: 'Error',
  args: { error: 'Russel Tan already has a slot in this session.' },
}
/** #1012: the recipient claimed the sender's transfer link */
export const ClaimedLink: Story = { args: { viaLink: true, recipientName: 'Bea Santos' } }
export const ClaimedLinkLight: Story = { ...ClaimedLink, globals: { theme: 'light' } }
/** #1013: what Approve records, shown before approving */
export const FullyPaid: Story = {
  args: {
    payment: { amountDueMinor: 90000, paidMinor: 90000, priorWaivedMinor: 0, waivedMinor: 0 },
  },
}
export const Unpaid: Story = {
  args: {
    payment: { amountDueMinor: 90000, paidMinor: 0, priorWaivedMinor: 0, waivedMinor: 90000 },
  },
}
export const NoFeeSet: Story = {
  args: {
    payment: { amountDueMinor: null, paidMinor: 0, priorWaivedMinor: 0, waivedMinor: 0 },
  },
}
export const FullyPaidLight: Story = { ...FullyPaid, globals: { theme: 'light' } }
export const UnpaidLight: Story = { ...Unpaid, globals: { theme: 'light' } }
export const NotInSessionLight: Story = { globals: { theme: 'light' } }
export const FromWaitlistLight: Story = { ...FromWaitlist, globals: { theme: 'light' } }
export const NoLevelYetLight: Story = { ...NoLevelYet, globals: { theme: 'light' } }
export const ErrorLight: Story = { ...ErrorState, globals: { theme: 'light' } }
/** #1014: cash was collected for the slot, so Reject and refund is offered beside Reject */
export const WithRejectAndRefund: Story = {
  args: {
    payment: { amountDueMinor: 90000, paidMinor: 50000, priorWaivedMinor: 0, waivedMinor: 40000 },
    onRejectAndRefund: fn(),
  },
}
export const WithRejectAndRefundLight: Story = {
  ...WithRejectAndRefund,
  globals: { theme: 'light' },
}
