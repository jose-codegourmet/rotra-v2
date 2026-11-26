import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { type LeaderboardPeriod, LeaderboardPeriodSwitch } from './LeaderboardPeriodSwitch'

const dateLabels = {
  year: '2026',
  quarter: 'Oct to Dec 2026',
  month: 'November 2026',
  week: 'Nov 16 to Nov 22',
} satisfies Record<LeaderboardPeriod, string>

const meta = {
  title: 'Player/LeaderboardPeriodSwitch',
  component: LeaderboardPeriodSwitch,
  args: { period: 'year', dateLabel: dateLabels.year, onChange: () => undefined },
  render: function Render(args) {
    const [period, setPeriod] = useState(args.period)
    return (
      <LeaderboardPeriodSwitch
        period={period}
        dateLabel={dateLabels[period]}
        onChange={setPeriod}
      />
    )
  },
} satisfies Meta<typeof LeaderboardPeriodSwitch>

export default meta
type Story = StoryObj<typeof meta>

export const Annual: Story = {}
export const Quarterly: Story = { args: { period: 'quarter' } }
export const Monthly: Story = { args: { period: 'month' } }
export const Weekly: Story = { args: { period: 'week' } }
