import type { AdminPlayerListParams } from '@rotra/data/admin-player/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { AdminPlayerFilters, type AdminPlayerFiltersProps } from './AdminPlayerFilters'

function InteractiveFilters(args: AdminPlayerFiltersProps) {
  const [filters, setFilters] = useState<AdminPlayerListParams>(args.filters)
  const [view, setView] = useState<'list' | 'grid'>('list')
  return (
    <AdminPlayerFilters
      {...args}
      filters={filters}
      onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
      onClear={() => setFilters({})}
      view={view}
      onViewChange={setView}
    />
  )
}

const meta = {
  title: 'Admin/AdminPlayerFilters',
  component: AdminPlayerFilters,
  render: (args) => <InteractiveFilters {...args} />,
  args: {
    filters: {},
    places: [
      { code: 'CEB', name: 'Cebu City' },
      { code: 'MNL', name: 'Manila' },
      { code: 'DVO', name: 'Davao City' },
    ],
    onChange: () => {},
    onClear: () => {},
  },
} satisfies Meta<typeof AdminPlayerFilters>
export default meta
type Story = StoryObj<typeof meta>
export const Closed: Story = {}
export const ClosedLight: Story = { globals: { theme: 'light' } }
export const Open: Story = { args: { defaultOpen: true } }
export const OpenLight: Story = { args: { defaultOpen: true }, globals: { theme: 'light' } }
export const Active: Story = {
  args: {
    defaultOpen: true,
    filters: {
      q: 'Alex',
      account: 'registered',
      duplicates: true,
      addedFrom: '2026-01-01',
      addedTo: '2026-11-08',
      place: ['CEB'],
      archived: 'all',
    },
  },
}
export const ActiveLight: Story = { ...Active, globals: { theme: 'light' } }
