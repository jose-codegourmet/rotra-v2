import { clubPlayers } from '@rotra/data/fixtures/players'
import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import { sessionWaitlistFixture } from '@rotra/data/fixtures/sessionWaitlist'
import type { PlayingLevel } from '@rotra/data/player/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { RosterPanel, type RosterPanelPlayer, type RosterPanelProps } from './RosterPanel'

// The tonight fixture: 14 players, Joanna missing a level, 10 present, 3 courts × 8 players.
const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')
const CAPACITY = 3 * tonight.playersPerCourt

const rosterPlayers: RosterPanelPlayer[] = queueSessionFixtures.roster.map((r) => {
  const p = clubPlayers.find((x) => x.id === r.clubPlayerId)
  if (!p) throw new Error('Club player fixture missing')
  return {
    id: r.id,
    name: r.nameSnapshot,
    identity: p.identity,
    suggestion: p.playingLevel,
    level: r.level,
    present: r.present,
  }
})

function Demo(props: RosterPanelProps) {
  const [players, setPlayers] = useState(props.players)
  const patch = (id: string, change: Partial<RosterPanelPlayer>) =>
    setPlayers((list) => list.map((p) => (p.id === id ? { ...p, ...change } : p)))
  return (
    <RosterPanel
      {...props}
      players={players}
      onMarkAllPresent={() => {
        setPlayers((list) => list.map((p) => ({ ...p, present: true })))
        props.onMarkAllPresent()
      }}
      onMarkAllAbsent={() => {
        setPlayers((list) => list.map((p) => ({ ...p, present: false })))
        props.onMarkAllAbsent()
      }}
      onLevelChange={(id, level: PlayingLevel) => {
        patch(id, { level })
        props.onLevelChange(id, level)
      }}
      onPresentChange={(id, present) => {
        patch(id, { present })
        props.onPresentChange(id, present)
      }}
      onRemove={(id) => {
        setPlayers((list) => list.filter((p) => p.id !== id))
        props.onRemove(id)
      }}
    />
  )
}

const meta = {
  title: 'Queue/RosterPanel',
  component: RosterPanel,
  decorators: [
    (Story) => (
      <div className="max-w-4xl">
        <Story />
      </div>
    ),
  ],
  args: {
    players: rosterPlayers,
    capacity: CAPACITY,
    onMarkAllPresent: fn(),
    onMarkAllAbsent: fn(),
    onAddPlayer: fn(),
    onOpenProfile: fn(),
    onLevelChange: fn(),
    onPresentChange: fn(),
    onRemove: fn(),
  },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof RosterPanel>

export default meta
type Story = StoryObj<typeof meta>

/** 14 of 24 slots, Joanna needs a level, 10 present */
export const Tonight: Story = {}
export const Empty: Story = { args: { players: [] } }
export const AllPresent: Story = {
  args: { players: rosterPlayers.map((p) => ({ ...p, present: true })) },
}
export const FullWithWaitlist: Story = {
  args: {
    players: rosterPlayers,
    capacity: rosterPlayers.length,
    waitlistCount: sessionWaitlistFixture.length,
  },
}
/** The roster is still loading: heading and Skeleton rows, no meter or actions. */
export const Loading: Story = { args: { players: [], loading: true } }
/** After the session started: levels are locked text with a lock, no select. */
export const Locked: Story = {
  args: {
    players: rosterPlayers.map((p) => ({
      ...p,
      level: p.level ?? ('intermediate_mid' as const),
    })),
    levelsLocked: true,
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
