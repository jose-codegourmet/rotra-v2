import type { Meta, StoryObj } from '@storybook/react-vite'
import { SalesBreakdownList, type SalesBreakdownListProps } from './SalesBreakdownList'

const plans = [
  { id: 'monthly', plan: 'Monthly', amountMinor: 450000, paymentCount: 3 },
  { id: 'yearly', plan: 'Yearly', amountMinor: 1500000, paymentCount: 1 },
]

const payments = [
  {
    id: 'p1',
    clubId: 'c1',
    clubName: 'Lahug Smash Club',
    plan: 'Yearly',
    paidOn: 'Nov 2, 2026',
    amountMinor: 1500000,
  },
  {
    id: 'p2',
    clubId: 'c2',
    clubName: 'IT Park Badminton Club',
    plan: 'Monthly',
    paidOn: 'Oct 28, 2026',
    amountMinor: 150000,
  },
  {
    id: 'p3',
    clubId: 'c5',
    clubName: 'Tester Club',
    plan: 'Monthly',
    paidOn: 'Oct 20, 2026',
    amountMinor: 0,
  },
]

const clubs = [
  { id: 'c1', clubName: 'Lahug Smash Club', sessions: 9, matches: 118, paidMinor: 1500000 },
  { id: 'c2', clubName: 'IT Park Badminton Club', sessions: 8, matches: 97, paidMinor: 150000 },
  { id: 'c3', clubName: 'Mandaue Shuttlers', sessions: 5, matches: 61, paidMinor: 0 },
]

const meta = {
  title: 'Admin/SalesBreakdownList',
  component: SalesBreakdownList,
  args: {
    kind: 'plans',
    items: plans,
    emptyText: 'No payments were recorded last 30 days.',
    note: "Money clubs paid last 30 days, as you recorded it when activating or renewing. ROTRA doesn't collect it.",
    onOpenClub: () => {},
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<SalesBreakdownListProps>

export default meta
type Story = StoryObj<SalesBreakdownListProps>

export const Plans: Story = {}
export const PlansLight: Story = { globals: { theme: 'light' } }
export const PlansOnePayment: Story = {
  args: { items: [{ id: 'monthly', plan: 'Monthly', amountMinor: 150000, paymentCount: 1 }] },
}
export const PlansEmpty: Story = {
  args: { items: [], emptyText: 'No payments were recorded last 7 days.' },
}
export const Payments: Story = {
  args: { kind: 'payments', items: payments, note: undefined },
}
export const PaymentsLight: Story = { ...Payments, globals: { theme: 'light' } }
export const PaymentsEmpty: Story = {
  args: {
    kind: 'payments',
    items: [],
    note: undefined,
    emptyText: 'No payments were recorded last 7 days.',
  },
}
export const PaymentsPhone: Story = { ...Payments, globals: { viewport: { value: 'phone' } } }
export const Clubs: Story = {
  args: {
    kind: 'clubs',
    items: clubs,
    emptyText: 'No sessions started last 30 days.',
    note: 'Sessions and matches are sample figures in this prototype. Revenue comes from the recorded license payments.',
  },
}
export const ClubsLight: Story = { ...Clubs, globals: { theme: 'light' } }
export const ClubsEmpty: Story = {
  args: {
    kind: 'clubs',
    items: [],
    emptyText: 'No sessions started last 7 days.',
    note: 'Sessions and matches are sample figures in this prototype. Revenue comes from the recorded license payments.',
  },
}
export const ClubsPhone: Story = { ...Clubs, globals: { viewport: { value: 'phone' } } }
