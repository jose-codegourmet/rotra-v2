import {
  allPaymentPlayers,
  paymentPlayers,
  paymentTotalsFixture,
  unpaidPaymentPlayers,
} from '@rotra/data/fixtures/financials'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import {
  PaymentsChecklist,
  type PaymentsChecklistProps,
  type PaymentFilter,
} from './PaymentsChecklist'

function Interactive(args: PaymentsChecklistProps) {
  const [filter, setFilter] = useState<PaymentFilter>(args.filter)
  return <PaymentsChecklist {...args} filter={filter} onFilterChange={setFilter} />
}
const meta = {
  title: 'Queue/PaymentsChecklist',
  component: PaymentsChecklist,
  render: (args) => <Interactive {...args} />,
  args: {
    amountDue: 70000,
    dueBasis: 'custom',
    entranceFeeIncluded: 6000,
    totals: paymentTotalsFixture,
    filter: 'all',
    players: paymentPlayers,
    onFilterChange: fn(),
    onTogglePaid: fn(),
    onMarkAllPaid: fn(),
    onSelectPlayer: fn(),
  },
} satisfies Meta<typeof PaymentsChecklist>
export default meta
type Story = StoryObj<typeof meta>
export const ThursdayOpenPlay15Of18: Story = {}
export const AllPaid: Story = {
  args: {
    players: allPaymentPlayers,
    totals: {
      ...paymentTotalsFixture,
      paid: 18,
      collected: 1260000,
      stillDue: 0,
      againstCosts: 27000,
    },
  },
}
export const NonePaid: Story = {
  args: {
    players: unpaidPaymentPlayers,
    totals: {
      ...paymentTotalsFixture,
      paid: 0,
      collected: 0,
      stillDue: 1260000,
      againstCosts: -1233000,
    },
  },
}
export const NoFeeSet: Story = {
  args: {
    amountDue: null,
    entranceFeeIncluded: undefined,
    players: unpaidPaymentPlayers,
    totals: { paid: 0, total: 18, collected: 0, stillDue: null, againstCosts: null, cost: null },
  },
}
export const FilterUnpaidEmpty: Story = { args: { ...AllPaid.args, filter: 'unpaid' } }
export const NoPlayers: Story = {
  args: {
    players: [],
    totals: { paid: 0, total: 0, collected: 0, stillDue: null, againstCosts: null, cost: null },
  },
}
export const AsSheet: Story = { args: { asSheet: true } }
export const SaveFailure: Story = { args: { saveError: 'Changes could not be saved' } }
export const Saving: Story = { args: { disabled: true } }
