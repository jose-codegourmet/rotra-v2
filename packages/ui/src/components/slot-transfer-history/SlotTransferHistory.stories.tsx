import { transferredSlotPayment } from '@rotra/data/fixtures/financials'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SlotTransferHistory } from './SlotTransferHistory'

const meta = {
  title: 'Queue/SlotTransferHistory',
  component: SlotTransferHistory,
  args: {
    holderName: 'Ana Cruz',
    transfer: transferredSlotPayment,
    cashMinor: 50000,
    status: { kind: 'paid' },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SlotTransferHistory>
export default meta
type Story = StoryObj<typeof meta>

export const RepeatTransfer: Story = {}
export const OneTransfer: Story = {
  args: {
    transfer: { waivedMinor: 20000, steps: transferredSlotPayment.steps.slice(0, 1) },
  },
}
/** The fee rose after the approval: the slot shows Partial against today's amount due */
export const FeeRoseAfter: Story = { args: { status: { kind: 'partial', left: 10000 } } }
export const RepeatTransferLight: Story = { globals: { theme: 'light' } }
export const OneTransferLight: Story = { ...OneTransfer, globals: { theme: 'light' } }
