import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { StatsVisibilityCard } from './StatsVisibilityCard'

const meta = {
  title: 'Player/StatsVisibilityCard',
  component: StatsVisibilityCard,
  args: { showProfileStats: true, showWeeklyPerformance: true, onToggle: fn() },
  decorators: [(Story) => <div className="mx-auto max-w-[560px]">{Story()}</div>],
} satisfies Meta<typeof StatsVisibilityCard>
export default meta
type Story = StoryObj<typeof meta>

export const BothOn: Story = {}
export const BothOnLight: Story = { globals: { theme: 'light' } }
export const StatsOff: Story = { args: { showProfileStats: false } }
export const WeeklyOff: Story = { args: { showWeeklyPerformance: false } }
export const WeeklyOffLight: Story = {
  args: { showWeeklyPerformance: false },
  globals: { theme: 'light' },
}
export const Saving: Story = { args: { pending: 'weekly' } }
export const OfflineError: Story = {
  args: { error: "Couldn't save because you're offline. Nothing changed." },
}
/** Opened from the weekly chart's chip: the row flashes and its switch takes focus */
export const Highlighted: Story = { args: { highlight: 'weekly' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
