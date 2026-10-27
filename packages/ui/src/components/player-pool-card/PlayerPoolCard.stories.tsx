import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { PlayerPoolCard, type PlayerPoolCardProps } from './PlayerPoolCard'

const { session, roster, matches } = consoleSessionFixture

const playerAt = (i: number): SessionPlayer => {
  const p = roster[i]
  if (!p) throw new Error(`No roster player ${i} in the console fixture`)
  return p
}

// Counted games: completed matches the player was in (the prototype's gamesOf()).
const gamesOf = (p: SessionPlayer) =>
  matches.filter(
    (m) => m.state === 'completed' && (m.teamA.includes(p.id) || m.teamB.includes(p.id)),
  ).length

const propsFor = (
  p: SessionPlayer,
  status: PlayerPoolCardProps['status'],
  waitMinutes?: number,
): PlayerPoolCardProps => ({
  name: p.nameSnapshot,
  level: p.level,
  games: gamesOf(p),
  minimumGames: session.minimumGames,
  waitMinutes,
  status,
  present: p.present,
  onToggleSelect: fn(),
  onPresentChange: fn(),
})

// Fixture roles: 0–3 are on Court 1 (match 1), 4 waits in match 2 (queue #1), 5 is away, 10 is free.
const playing = propsFor(playerAt(0), { kind: 'playing', courtLabel: 'Court 1' })
const queued = propsFor(playerAt(4), { kind: 'queued', position: 1 }, 12)
const away = propsFor(playerAt(5), { kind: 'away' })
const free = propsFor(playerAt(10), { kind: 'free' }, 27)

const meta = {
  title: 'Queue/PlayerPoolCard',
  component: PlayerPoolCard,
  decorators: [
    (Story) => (
      <div className="w-[156px]">
        <Story />
      </div>
    ),
  ],
  args: free,
} satisfies Meta<typeof PlayerPoolCard>

export default meta
type Story = StoryObj<typeof meta>

/** Present, off court and in no waiting match: shows the wait time and "Free" */
export const Available: Story = {}
/** On court: the status line turns accent and no wait time shows */
export const Playing: Story = { args: playing }
/** Not present: greyed picture, "Away", Present switch off */
export const Away: Story = { args: away }
/** Present and already in a waiting match */
export const Queued: Story = { args: queued }
/** Picked for the next match: accent ring and the pick-order badge */
export const SelectedWithOrder: Story = { args: { selected: true, pickOrder: 2 } }
export const NoLevel: Story = { args: { level: null } }
export const LongName: Story = {
  args: { name: `${free.name} Bautista Villareal de la Cruz` },
}

/** Tap, Enter or Space toggles selection; the Present switch is its own control */
export const Interactive: Story = {
  render: (args) => {
    const [selected, setSelected] = useState(false)
    const [present, setPresent] = useState(args.present)
    return (
      <PlayerPoolCard
        {...args}
        selected={selected}
        pickOrder={1}
        present={present}
        status={present ? args.status : { kind: 'away' }}
        onToggleSelect={() => setSelected((s) => !s)}
        onPresentChange={setPresent}
      />
    )
  },
}

const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,156px),1fr))] gap-2'

/** The prototype's .pgrid3 at 375 px: two cards per row, 54 × 32 px switches */
export const GridPhone: Story = {
  decorators: [
    (Story) => (
      <div className={`w-[343px] ${GRID}`}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      <PlayerPoolCard {...free} selected pickOrder={1} />
      <PlayerPoolCard {...queued} selected pickOrder={2} />
      <PlayerPoolCard {...playing} />
      <PlayerPoolCard {...away} />
    </>
  ),
  globals: { viewport: { value: 'phone' } },
}

/** The same cards at 1280 px: compact switches */
export const GridDesktop: Story = {
  decorators: [
    (Story) => (
      <div className={`max-w-4xl ${GRID}`}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      <PlayerPoolCard {...free} selected pickOrder={1} />
      <PlayerPoolCard {...queued} selected pickOrder={2} />
      <PlayerPoolCard {...playing} />
      <PlayerPoolCard {...away} />
      <PlayerPoolCard {...propsFor(playerAt(6), { kind: 'queued', position: 2 }, 9)} />
      <PlayerPoolCard {...propsFor(playerAt(11), { kind: 'free' }, 41)} />
    </>
  ),
  globals: { viewport: { value: 'desktop' } },
}
