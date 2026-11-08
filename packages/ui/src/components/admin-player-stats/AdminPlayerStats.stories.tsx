import type { AdminPlayerListParams } from '@rotra/data/admin-player/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { AdminPlayerStats, type AdminPlayerStatsProps } from './AdminPlayerStats'

function InteractiveStats(args: AdminPlayerStatsProps) {
  const [filters, setFilters] = useState(args.filters)
  return (
    <AdminPlayerStats
      {...args}
      filters={filters}
      onChange={(patch: Partial<AdminPlayerListParams>) =>
        setFilters((current) => ({ ...current, ...patch }))
      }
    />
  )
}
const meta = {
  title: 'Admin/AdminPlayerStats',
  component: AdminPlayerStats,
  render: (args) => <InteractiveStats {...args} />,
  args: {
    filters: {},
    onChange: () => {},
    stats: { advanced: 3, intermediate: 8, beginner: 5, noRank: 2, registered: 10, unclaimed: 8 },
  },
} satisfies Meta<typeof AdminPlayerStats>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
export const Selected: Story = { args: { filters: { level: 'advanced', account: 'registered' } } }
export const SelectedLight: Story = { ...Selected, globals: { theme: 'light' } }
export const Loading: Story = { args: { stats: undefined } }
