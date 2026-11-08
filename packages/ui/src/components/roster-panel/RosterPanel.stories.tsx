import { paymentPlayers } from '@rotra/data/fixtures/financials'
import { clubPlayers } from '@rotra/data/fixtures/players'
import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import { sessionHistorySpecs } from '@rotra/data/fixtures/session-history'
import { sessionWaitlistFixture } from '@rotra/data/fixtures/session-waitlist'
import type { PlayingLevel } from '@rotra/data/player/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { RosterPanel, type RosterPanelPlayer, type RosterPanelProps } from './RosterPanel'

// The tonight fixture: 17 players, Dexter missing a level, 13 present, 4 courts × 8 players.
const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')
const courtCount = queueSessionFixtures.courts.filter((c) => c.sessionId === tonight.id).length
const CAPACITY = courtCount * tonight.playersPerCourt

const paidByClubPlayer = new Map(paymentPlayers.map((p) => [p.clubPlayerId, Boolean(p.paid)]))
const playedHere = new Set(
  sessionHistorySpecs.flatMap((spec) =>
    spec.players.map((n) => clubPlayers[n - 1]?.id).filter((id): id is string => Boolean(id)),
  ),
)

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
    paid: paidByClubPlayer.get(p.id) ?? false,
    returning: playedHere.has(p.id),
  }
})

const mixedIdentityPlayers: RosterPanelPlayer[] = rosterPlayers.map((p, i) => ({
  ...p,
  identity: i % 5 === 0 ? 'guest' : i % 7 === 0 ? 'pending' : p.identity,
}))

const noBeginnerPlayers: RosterPanelPlayer[] = rosterPlayers.map((p) => ({
  ...p,
  level: p.level?.startsWith('beginner') ? 'intermediate_mid' : p.level,
}))

function Demo(props: RosterPanelProps) {
  const [players, setPlayers] = useState(props.players)
  const [levelTab, setLevelTab] = useState(props.levelTab ?? 'all')
  const [groupBy, setGroupBy] = useState(props.groupBy ?? 'none')
  const [view, setView] = useState(props.view ?? 'list')
  const patch = (id: string, change: Partial<RosterPanelPlayer>) =>
    setPlayers((list) => list.map((p) => (p.id === id ? { ...p, ...change } : p)))
  return (
    <RosterPanel
      {...props}
      players={players}
      levelTab={levelTab}
      groupBy={groupBy}
      view={view}
      onLevelTabChange={(tab) => {
        setLevelTab(tab)
        props.onLevelTabChange?.(tab)
      }}
      onGroupByChange={(next) => {
        setGroupBy(next)
        props.onGroupByChange?.(next)
      }}
      onViewChange={(next) => {
        setView(next)
        props.onViewChange?.(next)
      }}
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

/** 17 of 32 slots, Dexter needs a level, 13 present */
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
export const PhoneLevelMenu: Story = {
  args: { levelTab: 'advanced' },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }

export const ReadOnly: Story = { args: { ...Locked.args, readOnly: true } }

export const Grid: Story = { args: { view: 'grid' } }
export const GridPhone: Story = {
  args: { view: 'grid' },
  globals: { viewport: { value: 'phone' } },
}
export const TabAdvanced: Story = { args: { levelTab: 'advanced' } }
export const TabIntermediate: Story = { args: { levelTab: 'intermediate' } }
export const TabBeginner: Story = { args: { levelTab: 'beginner' } }
export const TabNoLevel: Story = { args: { levelTab: 'none' } }
export const EmptyLevelTab: Story = {
  args: { players: noBeginnerPlayers, levelTab: 'beginner' },
}
export const GroupBySkill: Story = { args: { groupBy: 'skill' } }
export const GroupByAvailability: Story = { args: { groupBy: 'avail' } }
export const GroupByReturning: Story = { args: { groupBy: 'prior' } }
export const GroupByProfile: Story = {
  args: { players: mixedIdentityPlayers, groupBy: 'profile' },
}
export const GroupByPayment: Story = { args: { groupBy: 'paid' } }
export const GroupBySkillGrid: Story = { args: { groupBy: 'skill', view: 'grid' } }
export const LockedGrid: Story = { args: { ...Locked.args, view: 'grid' } }
