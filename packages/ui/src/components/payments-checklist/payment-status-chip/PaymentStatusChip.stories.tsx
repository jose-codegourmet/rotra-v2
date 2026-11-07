import type { Meta, StoryObj } from '@storybook/react-vite'
import { PaymentStatusChip } from './PaymentStatusChip'

const meta = {
  title: 'Queue/PaymentStatusChip',
  component: PaymentStatusChip,
  args: { status: { kind: 'paid' } },
} satisfies Meta<typeof PaymentStatusChip>
export default meta
type Story = StoryObj<typeof meta>
export const Paid: Story = {}
export const Partial: Story = { args: { status: { kind: 'partial', left: 20000 } } }
export const Reimburse: Story = { args: { status: { kind: 'reimburse', toReturn: 10000 } } }
export const Unpaid: Story = { args: { status: { kind: 'unpaid' } } }
