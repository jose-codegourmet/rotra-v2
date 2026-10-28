import { allPaymentPlayers, unpaidPaymentPlayers } from '@rotra/data/fixtures/financials'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PaymentCard } from './PaymentCard'

const meta = {
  title: 'Queue/PaymentCard',
  component: PaymentCard,
  args: {
    player: unpaidPaymentPlayers[0]!,
    amountDue: 70000,
    onTogglePaid: fn(),
    onSelectPlayer: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-60">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PaymentCard>
export default meta
type Story = StoryObj<typeof meta>
export const Unpaid: Story = {}
export const Paid: Story = { args: { player: allPaymentPlayers[0]! } }
