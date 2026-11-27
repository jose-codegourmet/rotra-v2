import {
  allPaymentPlayers,
  mixedPaymentPlayers,
  transferredPaymentPlayer,
  unpaidPaymentPlayers,
} from '@rotra/data/fixtures/financials'
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
    onEditAmount: fn(),
    onOpenHistory: fn(),
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
export const Partial: Story = { args: { player: mixedPaymentPlayers[3]! } }
export const Reimburse: Story = { args: { player: mixedPaymentPlayers[4]! } }
export const NoFeeSet: Story = { args: { amountDue: null } }
/** #1013: paid through a slot transfer: locked switch, waiver line, the body opens Slot history */
export const ViaTransfer: Story = { args: { player: transferredPaymentPlayer } }
export const ViaTransferLight: Story = { ...ViaTransfer, globals: { theme: 'light' } }
export const Free: Story = { args: { player: { ...unpaidPaymentPlayers[0]!, free: true } } }
export const FreeLight: Story = { ...Free, globals: { theme: 'light' } }
