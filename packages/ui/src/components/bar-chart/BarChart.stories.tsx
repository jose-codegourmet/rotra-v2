import type { Meta, StoryObj } from '@storybook/react-vite'
import { BarChart } from './BarChart'

const days = Array.from({ length: 30 }, (_, i) => {
  const value = [0, 1500, 0, 0, 3000, 0, 1500, 0, 0, 0][i % 10] ?? 0
  return { id: `d${i}`, value, valueLabel: `₱${value.toLocaleString('en-PH')}` }
})

const months = [
  ['Jun', 1500],
  ['Jul', 0],
  ['Aug', 1500],
  ['Sep', 15000],
  ['Oct', 0],
  ['Nov', 1500],
].map(([label, value]) => ({
  id: String(label),
  label: String(label),
  value: Number(value),
  valueLabel: `₱${Number(value).toLocaleString('en-PH')}`,
}))

const meta = {
  title: 'Admin/BarChart',
  component: BarChart,
  args: { bars: days, 'aria-label': 'Revenue per day' },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BarChart>

export default meta
type Story = StoryObj<typeof meta>

export const Spark: Story = {}
export const SparkLight: Story = { globals: { theme: 'light' } }
export const SparkAllZero: Story = {
  args: { bars: days.map((bar) => ({ ...bar, value: 0, valueLabel: '₱0' })) },
}
export const Labeled: Story = {
  args: { bars: months, variant: 'labeled', 'aria-label': 'Paid each month' },
}
export const LabeledLight: Story = { ...Labeled, globals: { theme: 'light' } }
export const LabeledPhone: Story = { ...Labeled, globals: { viewport: { value: 'phone' } } }
