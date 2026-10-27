import { Avatar } from '@rotra/ui/avatar'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { EmptyState } from '@rotra/ui/empty-state'
import { ErrorState } from '@rotra/ui/error-state'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { TextInput } from '@rotra/ui/text-input'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createColumnHelper } from '@tanstack/react-table'
import { useState } from 'react'
import { DataTable } from './DataTable'

// Rows from the admin prototype's seedClubs(); they move to @rotra/data fixtures in F06.2.
type ClubRow = {
  id: string
  name: string
  username: string
  city: string
  code: string
  price: string
  plan: string
  access: 'Active' | 'Expired' | 'No license'
  until: string
}

const CLUBS: ClubRow[] = [
  {
    id: 'c1',
    name: 'Lahug Smash Club',
    username: 'lahug.smash',
    city: 'Cebu City',
    code: 'PH-CEB',
    price: '₱1,500 /mo',
    plan: 'Yearly',
    access: 'Active',
    until: 'Mar 31, 2027',
  },
  {
    id: 'c2',
    name: 'IT Park Badminton Club',
    username: 'itpark.badminton',
    city: 'Cebu City',
    code: 'PH-CEB',
    price: '₱1,500 /mo',
    plan: 'Monthly',
    access: 'Active',
    until: 'Nov 2, 2026',
  },
  {
    id: 'c3',
    name: 'Matina Smash Club',
    username: 'matina.smash',
    city: 'Davao City',
    code: 'PH-DVO',
    price: '₱1,200 /mo',
    plan: 'Yearly',
    access: 'Active',
    until: 'Feb 14, 2027',
  },
  {
    id: 'c4',
    name: 'Sampaloc Shuttle Club',
    username: 'sampaloc.shuttle',
    city: 'Manila',
    code: 'PH-MNL',
    price: '₱1,800 /mo',
    plan: 'Monthly',
    access: 'Active',
    until: 'Nov 9, 2026',
  },
  {
    id: 'c5',
    name: 'Talamban Racket Club',
    username: 'talamban.racket',
    city: 'Cebu City',
    code: 'PH-CEB',
    price: '₱1,500 /mo',
    plan: 'Monthly',
    access: 'Expired',
    until: 'Ended Sep 30, 2026',
  },
]

const col = createColumnHelper<ClubRow>()
const columns = [
  col.accessor('name', {
    header: 'Club',
    meta: { lead: true },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={row.original.name} shape="square" size={36} />
        <div className="flex min-w-0 flex-col">
          <b className="[overflow-wrap:anywhere]">{row.original.name}</b>
          <span className="font-mono text-[13px] text-fg2">{row.original.username}</span>
        </div>
      </div>
    ),
  }),
  col.accessor('city', {
    header: 'Founded in',
    cell: ({ row }) => (
      <>
        {row.original.city}{' '}
        <span className="font-mono text-[13px] text-fg2">{row.original.code}</span>
      </>
    ),
  }),
  col.accessor('price', { header: 'Price', meta: { nowrap: true } }),
  col.accessor('plan', { header: 'Plan' }),
  col.accessor('access', {
    header: 'Access',
    cell: ({ getValue }) => (
      <Chip
        tone={getValue() === 'Active' ? 'accent' : getValue() === 'Expired' ? 'warn' : 'neutral'}
      >
        {getValue()}
      </Chip>
    ),
  }),
  col.accessor('until', { header: 'Until', meta: { nowrap: true } }),
]

function ClubsTable(props: { loading?: boolean; failed?: boolean; rows?: ClubRow[] }) {
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const rows = (props.rows ?? CLUBS).filter(
    (c) =>
      (filter === 'all' || c.access.toLowerCase() === filter) &&
      [c.name, c.username, c.city].join(' ').toLowerCase().includes(q.toLowerCase()),
  )
  return (
    <Card>
      <DataTable
        aria-label="Clubs"
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        onRowClick={() => {}}
        loading={props.loading}
        error={
          props.failed ? (
            <ErrorState title="Couldn't load clubs." onRetry={() => {}}>
              Check your connection, then try again.
            </ErrorState>
          ) : undefined
        }
        empty={
          <EmptyState title="No clubs match.">
            Check the spelling, or search by the club's username.
          </EmptyState>
        }
        toolbar={
          <>
            <div className="min-w-0 flex-[1_1_260px]">
              <TextInput
                type="search"
                aria-label="Search clubs"
                placeholder="Search by club name, username or city"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <SegmentedControl
              aria-label="Filter by access"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All', count: CLUBS.length },
                { value: 'active', label: 'Active', count: 4 },
                { value: 'expired', label: 'Expired', count: 1 },
              ]}
            />
          </>
        }
      />
    </Card>
  )
}

const meta = {
  title: 'Shared/DataTable',
  component: DataTable,
  args: { 'aria-label': 'Clubs', columns: [], data: [] },
} satisfies Meta<typeof DataTable>

export default meta
type Story = StoryObj<typeof meta>

export const Clubs: Story = { render: () => <ClubsTable /> }
export const Phone: Story = {
  render: () => <ClubsTable />,
  globals: { viewport: { value: 'phone' } },
}
export const Loading: Story = { render: () => <ClubsTable loading /> }
export const Empty: Story = { render: () => <ClubsTable rows={[]} /> }
export const Failed: Story = { render: () => <ClubsTable failed /> }
