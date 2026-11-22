import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { RefundConfirmSheet } from './RefundConfirmSheet'

const meta = {
  title: 'Queue/RefundConfirmSheet',
  component: RefundConfirmSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    variant: 'transfer',
    name: 'Ana Cruz',
    recipientName: 'Marco Lim',
    amountMinor: 20000,
    nextWaiterName: 'Rhea Villanueva',
    onConfirm: fn(),
  },
} satisfies Meta<typeof RefundConfirmSheet>
export default meta
type Story = StoryObj<typeof meta>

export const RejectAndRefund: Story = {}
/** Nobody is waiting: the freed slot stays open */
export const NobodyWaiting: Story = { args: { nextWaiterName: null } }
/** A carried slot: its earlier waiver is named as not refunded */
export const CarriedSlot: Story = { args: { amountMinor: 50000, waivedMinor: 40000 } }
export const Pending: Story = { args: { isPending: true } }
export const Refused: Story = {
  args: {
    error: 'The payment for this slot changed: the full refund is now ₱250. Check and try again.',
  },
}
export const SessionRefund: Story = { args: { variant: 'session', amountMinor: 25000 } }
export const RejectAndRefundLight: Story = { globals: { theme: 'light' } }
export const SessionRefundLight: Story = {
  args: { variant: 'session', amountMinor: 25000 },
  globals: { theme: 'light' },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
