import { Chip } from '@rotra/ui/chip'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { WeeklyPerformanceChart, type WeeklyPerformanceFilter } from './WeeklyPerformanceChart'

const days = [
  { wins: 6, losses: 3 },
  { wins: 0, losses: 0 },
  { wins: 1, losses: 2 },
  { wins: 2, losses: 0 },
  { wins: 4, losses: 4 },
  { wins: 0, losses: 1 },
  { wins: 9, losses: 2 },
]
const meta = {
  title: 'Player/WeeklyPerformanceChart',
  component: WeeklyPerformanceChart,
  args: { days, year: 2026 },
  render: function Render(args) {
    const [filter, setFilter] = useState<WeeklyPerformanceFilter | null>(args.filter ?? null)
    return <WeeklyPerformanceChart {...args} filter={filter} onFilterChange={setFilter} />
  },
} satisfies Meta<typeof WeeklyPerformanceChart>
export default meta
type Story = StoryObj<typeof meta>

export const GamesPage: Story = { globals: { theme: 'dark' } }
export const GamesPageLight: Story = { globals: { theme: 'light' } }
export const Filtered: Story = {
  args: { filter: { day: 6, result: 'won' } },
  globals: { theme: 'dark' },
}
export const SingleWeekday: Story = {
  args: { days: days.map((d, i) => (i === 4 ? d : { wins: 0, losses: 0 })) },
}
/** No weekday has 3 games, so there is no best day. */
export const NoBestDay: Story = {
  args: { days: days.map((d, i) => (i === 3 ? d : { wins: 0, losses: 0 })) },
}
/** Renders nothing. */
export const NoGames: Story = { args: { days: days.map(() => ({ wins: 0, losses: 0 })) } }
export const ProfileReadOnly: Story = {
  args: {
    readOnly: true,
    onSeeAllGames: () => {},
    visibility: <Chip tone="accent">Public</Chip>,
  },
  globals: { theme: 'dark' },
}
export const ProfileReadOnlyLight: Story = {
  args: { readOnly: true, onSeeAllGames: () => {} },
  globals: { theme: 'light' },
}
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }
export const PhoneLight: Story = { globals: { theme: 'light', viewport: { value: 'phone' } } }
