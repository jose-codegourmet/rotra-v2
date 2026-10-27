import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { PlayerTile, type PlayerTileProps } from './PlayerTile'

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

const propsFor = (p: SessionPlayer, status: PlayerTileProps['status']): PlayerTileProps => ({
  name: p.nameSnapshot,
  level: p.level,
  games: gamesOf(p),
  minimumGames: session.minimumGames,
  status,
  onClick: fn(),
})

// Fixture roles: 0–3 are on Court 1 (match 1), 5 is away, 4 and 10 are resting.
const playing = propsFor(playerAt(0), { kind: 'playing', courtLabel: 'Court 1' })
const away = propsFor(playerAt(5), { kind: 'away' })
const resting = propsFor(playerAt(10), { kind: 'resting', minutes: 27 })
const taken = propsFor(playerAt(4), { kind: 'note', text: 'Already in this match' })

const meta = {
  title: 'Queue/PlayerTile',
  component: PlayerTile,
  decorators: [
    (Story) => (
      <div className="w-32">
        <Story />
      </div>
    ),
  ],
  args: resting,
} satisfies Meta<typeof PlayerTile>

export default meta
type Story = StoryObj<typeof meta>

/** Present and off court: "Resting M min" in accent */
export const Resting: Story = {}
/** On court: "Playing · Court X" in warn */
export const Playing: Story = { args: playing }
/** Not present: greyed picture, "Not present" */
export const Away: Story = { args: away }
/** The current choice for the slot */
export const Pressed: Story = { args: { pressed: true } }
/** Already in another slot of this match: disabled with the note */
export const AlreadyInThisMatch: Story = { args: { ...taken, disabled: true } }
/** Substitution: the note names the player's team */
export const TeamNote: Story = { args: propsFor(playerAt(1), { kind: 'note', text: 'Team A' }) }
export const NoLevel: Story = { args: { level: null } }
export const LongName: Story = {
  args: { name: `${resting.name} Bautista Villareal de la Cruz` },
}

/** Tapping toggles the choice */
export const Interactive: Story = {
  render: (args) => {
    const [pressed, setPressed] = useState(false)
    return <PlayerTile {...args} pressed={pressed} onClick={() => setPressed((p) => !p)} />
  },
}

const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,128px),1fr))] gap-2.5'

const grid = () => (
  <>
    <PlayerTile {...resting} pressed />
    <PlayerTile {...propsFor(playerAt(6), { kind: 'resting', minutes: 9 })} />
    <PlayerTile {...taken} disabled />
    <PlayerTile {...playing} />
    <PlayerTile {...away} />
  </>
)

/** The prototype's .pick-grid at 375 px: tiles at least 60 px tall */
export const GridPhone: Story = {
  decorators: [
    (Story) => (
      <div className={`w-[343px] ${GRID}`}>
        <Story />
      </div>
    ),
  ],
  render: grid,
  globals: { viewport: { value: 'phone' } },
}

/** The same tiles at 1280 px */
export const GridDesktop: Story = {
  decorators: [
    (Story) => (
      <div className={`max-w-3xl ${GRID}`}>
        <Story />
      </div>
    ),
  ],
  render: grid,
  globals: { viewport: { value: 'desktop' } },
}
