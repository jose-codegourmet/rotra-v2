import { statusForReceived } from '@rotra/data/session-payment/rules'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PaymentAmountForm } from './PaymentAmountForm'
import { paymentAmountInputFrom } from './PaymentAmountForm.defaultValues'

const due = 70000

const meta = {
  title: 'Queue/PaymentAmountForm',
  component: PaymentAmountForm,
  args: {
    amountDue: due,
    defaultValues: paymentAmountInputFrom(null, due),
    previewStatus: (received: number) => statusForReceived(received, due),
    onSubmit: fn(),
    onCancel: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-[560px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PaymentAmountForm>
export default meta
type Story = StoryObj<typeof meta>

export const FullAmount: Story = {}
export const Partial: Story = { args: { defaultValues: paymentAmountInputFrom(50000, due) } }
/** The fee dropped to ₱550 after ₱700 was received: ₱150 to return outside ROTRA. */
export const Reimburse: Story = {
  args: {
    amountDue: 55000,
    defaultValues: paymentAmountInputFrom(70000, 55000),
    previewStatus: (received: number) => statusForReceived(received, 55000),
  },
}
export const NoFeeSet: Story = {
  args: {
    amountDue: null,
    defaultValues: paymentAmountInputFrom(null, null),
    previewStatus: (received: number) => statusForReceived(received, null),
  },
}
export const Pending: Story = { args: { isPending: true } }
export const ServerError: Story = {
  args: { serverError: 'Payments are not available for this session.' },
}
