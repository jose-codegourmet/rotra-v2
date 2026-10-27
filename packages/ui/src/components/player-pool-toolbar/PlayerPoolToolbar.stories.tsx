import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import {
  PlayerPoolToolbar,
  type PlayerPoolShow,
  type PlayerPoolSort,
} from './PlayerPoolToolbar'

// Counts from the console fixture: four players are on Court 1 (match 1) and one is away.
const { roster, matches } = consoleSessionFixture
const onCourt = new Set(
  matches.filter((m) => m.state === 'active').flatMap((m) => [...m.teamA, ...m.teamB]),
)
const counts = {
  available: roster.filter((p) => p.present && !onCourt.has(p.id)).length,
  present: roster.filter((p) => p.present).length,
  everyone: roster.length,
}

const meta = {
  title: 'Queue/PlayerPoolToolbar',
  component: PlayerPoolToolbar,
  args: {
    show: 'available',
    sort: 'wait',
    counts,
    onShowChange: fn(),
    onSortChange: fn(),
  },
} satisfies Meta<typeof PlayerPoolToolbar>

export default meta
type Story = StoryObj<typeof meta>

/** Available · 9 is on by default; sort is longest wait */
export const Counts: Story = {}
export const Present: Story = { args: { show: 'present', sort: 'least' } }
export const Everyone: Story = { args: { show: 'everyone', sort: 'level' } }
export const NoOneFree: Story = { args: { counts: { ...counts, available: 0 } } }

export const Interactive: Story = {
  render: (args) => {
    const [show, setShow] = useState<PlayerPoolShow>(args.show)
    const [sort, setSort] = useState<PlayerPoolSort>(args.sort)
    return (
      <PlayerPoolToolbar
        {...args}
        show={show}
        sort={sort}
        onShowChange={setShow}
        onSortChange={setSort}
      />
    )
  },
}

/** At 375 px the sort select wraps under the filter; segments are 44 px tall */
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
