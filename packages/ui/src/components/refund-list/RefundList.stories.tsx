import { refundList } from '@rotra/data/session-payment/refund-rules'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { RefundList } from './RefundList'

const at = Date.UTC(2026, 10, 21, 13, 0)
const list = refundList(
  [
    { entryId: 'a', name: 'Ana Cruz', receivedMinor: 25000, waivedMinor: 0, refund: null },
    { entryId: 'b', name: 'Ben Santos', receivedMinor: 12000, waivedMinor: 0, refund: null },
    {
      entryId: 'c',
      name: 'Cara Lim',
      receivedMinor: 25000,
      waivedMinor: 0,
      refund: { amountMinor: 25000, refundedAt: at },
    },
  ],
  25000,
)
const allDone = refundList(
  [
    {
      entryId: 'c',
      name: 'Cara Lim',
      receivedMinor: 25000,
      waivedMinor: 0,
      refund: { amountMinor: 25000, refundedAt: at },
    },
  ],
  25000,
)

const meta = {
  title: 'Queue/RefundList',
  component: RefundList,
  args: { ...list, whenLabel: () => 'yesterday 9:00 PM', onRecord: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RefundList>
export default meta
type Story = StoryObj<typeof meta>

export const SomeLeft: Story = {}
export const AllRecorded: Story = { args: { ...allDone } }
export const Offline: Story = {
  args: { disabled: true, disabledReason: "You're offline. Reconnect and try again." },
}
export const SomeLeftLight: Story = { globals: { theme: 'light' } }
export const AllRecordedLight: Story = { args: { ...allDone }, globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
