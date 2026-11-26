import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import {
  DEFAULT_PLAYER_POOL_SORT,
  type PlayerPoolShow,
  type PlayerPoolSort,
  PlayerPoolToolbar,
} from './PlayerPoolToolbar'

// Counts from the console fixture: four players are on Court 1 (match 1) and one is away.
const { roster, matches } = consoleSessionFixture
const onCourt = new Set(
  matches.filter((m) => m.state === 'active').flatMap((m) => [...m.teamA, ...m.teamB]),
)
const counts = {
  available: roster.filter((p) => p.present && !onCourt.has(p.id)).length,
  present: roster.filter((p) => p.present).length,
  away: roster.filter((p) => !p.present).length,
  waitlist: 2,
  everyone: roster.length,
}

const meta = {
  title: 'Queue/PlayerPoolToolbar',
  component: PlayerPoolToolbar,
  args: {
    show: 'available',
    sort: DEFAULT_PLAYER_POOL_SORT,
    counts,
    onShowChange: fn(),
    onSortChange: fn(),
  },
} satisfies Meta<typeof PlayerPoolToolbar>

export default meta
type Story = StoryObj<typeof meta>

/** Available · 9 is on by default; the sort is Wait, longest first (its arrow points down) */
export const Counts: Story = {}
/** Games, fewest first (arrow up); tapping Games again would flip it to most games */
export const Present: Story = { args: { show: 'present', sort: { key: 'games', dir: 1 } } }
/** Name Z–A: the second direction */
export const NameZToA: Story = { args: { show: 'everyone', sort: { key: 'name', dir: -1 } } }
export const NameZToALight: Story = { ...NameZToA, globals: { theme: 'light' } }
export const NotHere: Story = { args: { show: 'away' } }
/** Waitlist replaces the cards, so the sort menu is hidden */
export const Waitlist: Story = { args: { show: 'waitlist' } }
export const Everyone: Story = { args: { show: 'everyone', sort: { key: 'level', dir: 1 } } }
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

/** At 375 px the sort is the dropdown (both directions of each) and wraps under the filter */
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
