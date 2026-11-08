import type { Meta, StoryObj } from '@storybook/react-vite'
import { ClubSalesTable } from './ClubSalesTable'

const months = [
  {
    id: '2026-06',
    label: 'Jun 2026',
    paidMinor: 150000,
    sessions: 9,
    matches: 118,
    estCostMinor: 135000,
  },
  {
    id: '2026-07',
    label: 'Jul 2026',
    paidMinor: 0,
    sessions: 8,
    matches: 97,
    estCostMinor: 120000,
  },
  {
    id: '2026-08',
    label: 'Aug 2026',
    paidMinor: 150000,
    sessions: 10,
    matches: 131,
    estCostMinor: 150000,
  },
  {
    id: '2026-09',
    label: 'Sep 2026',
    paidMinor: 1500000,
    sessions: 7,
    matches: 84,
    estCostMinor: 105000,
  },
  {
    id: '2026-10',
    label: 'Oct 2026',
    paidMinor: 0,
    sessions: 9,
    matches: 112,
    estCostMinor: 135000,
  },
  {
    id: '2026-11',
    label: 'Nov 2026',
    paidMinor: 150000,
    sessions: 2,
    matches: 25,
    estCostMinor: 30000,
  },
]

const meta = {
  title: 'Admin/ClubSalesTable',
  component: ClubSalesTable,
  args: { months, monthlyListMinor: 150000, costPerSessionMinor: 1500 },
} satisfies Meta<typeof ClubSalesTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const PhoneLight: Story = { globals: { viewport: { value: 'phone' }, theme: 'light' } }
export const RunningCostHigher: Story = {
  args: {
    months: months.map((m) => ({ ...m, paidMinor: 0 })),
  },
}
export const TesterClub: Story = {
  args: {
    free: true,
    months: months.map((m) => ({ ...m, paidMinor: 0 })),
  },
}
export const NoSessions: Story = {
  args: {
    months: months.map((m) => ({ ...m, sessions: 0, matches: 0, estCostMinor: 0 })),
  },
}
