import type { Meta, StoryObj } from '@storybook/react-vite'
import { SalesStatCard } from './SalesStatCard'

const bars = Array.from({ length: 30 }, (_, i) => {
  const value = [0, 1, 0, 0, 2, 0, 1, 0, 0, 1][i % 10] ?? 0
  return { id: `d${i}`, value, valueLabel: String(value) }
})

const meta = {
  title: 'Admin/SalesStatCard',
  component: SalesStatCard,
  args: {
    label: 'Sessions started',
    value: '42',
    change: { kind: 'up', percent: 12 },
    bars,
    chartLabel: 'Sessions started per day',
  },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SalesStatCard>

export default meta
type Story = StoryObj<typeof meta>

export const Up: Story = {}
export const UpLight: Story = { globals: { theme: 'light' } }
export const Down: Story = {
  args: { label: 'Revenue', value: '₱16,500', change: { kind: 'down', percent: 8 } },
}
export const DownLight: Story = { ...Down, globals: { theme: 'light' } }
export const NoChange: Story = { args: { change: { kind: 'same' } } }
export const New: Story = { args: { change: { kind: 'new' } } }
export const NotEnoughHistory: Story = { args: { change: { kind: 'no-history' } } }
export const NoData: Story = {
  args: {
    label: 'Matches played',
    value: '0',
    change: { kind: 'same' },
    bars: bars.map((bar) => ({ ...bar, value: 0, valueLabel: '0' })),
  },
}
export const SummaryNote: Story = {
  args: {
    label: 'Paid to ROTRA (6 months)',
    value: '₱18,000',
    change: undefined,
    bars: undefined,
    note: '₱1,500 a month list price',
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
