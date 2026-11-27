import type { CourtPlayer } from '@rotra/ui/court-drawing'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import {
  LiveMatchHistory,
  type LiveMatchHistoryMatch,
  type LiveMatchHistoryProps,
} from './LiveMatchHistory'

const names = [
  'Ana Reyes',
  'Ben Cruz',
  'Carla Diaz',
  'Dan Lim',
  'Ella Tan',
  'Finn Ong',
  'Gia Sy',
  'Hugo Lee',
  'Ivy Uy',
  'Jon Co',
]
const player = (i: number): CourtPlayer => {
  const name = names[i % names.length] as string
  return { id: `p${i}`, name, shortName: name.split(' ')[0] as string, level: null }
}
const team = (...ids: number[]) => ids.map(player)

// Session night: 7:00 PM in the club zone (UTC+8) is 11:00 UTC.
const T0 = Date.UTC(2026, 10, 24, 11, 0)
const at = (min: number) => T0 + min * 60_000

const courts = [
  { id: 'c1', label: 'Court 1' },
  { id: 'c2', label: 'Court 2' },
  { id: 'c3', label: 'Court 3' },
]

const matches: LiveMatchHistoryMatch[] = [
  {
    id: 'm1',
    number: 1,
    courtIds: ['c1'],
    startedAt: at(0),
    endedAt: at(16),
    teamA: team(0, 1),
    teamB: team(2, 3),
    winningTeam: 'A',
    score: { teamA: 21, teamB: 17 },
  },
  {
    id: 'm2',
    number: 2,
    courtIds: ['c2'],
    startedAt: at(2),
    endedAt: at(20),
    teamA: team(4, 5),
    teamB: team(6, 7),
    winningTeam: 'B',
    score: { teamA: 18, teamB: 21 },
  },
  {
    id: 'm3',
    number: 3,
    courtIds: ['c1'],
    startedAt: at(18),
    endedAt: at(33),
    teamA: team(0, 2),
    teamB: team(1, 3),
    winningTeam: 'B',
    score: null,
  },
  {
    id: 'm4',
    number: 4,
    courtIds: ['c2'],
    startedAt: at(22),
    endedAt: at(40),
    teamA: team(4, 6),
    teamB: team(5, 7),
    winningTeam: 'A',
    score: { teamA: 21, teamB: 19 },
    substitutionCredits: [{ outName: 'Gia Sy', inName: 'Ivy Uy', creditTo: 'incoming' }],
  },
  {
    id: 'm5',
    number: 5,
    courtIds: ['c1'],
    startedAt: at(36),
    endedAt: at(52),
    teamA: team(0, 3),
    teamB: team(1, 2),
    winningTeam: 'A',
    score: { teamA: 21, teamB: 12 },
  },
]

const meta = {
  title: 'Queue/LiveMatchHistory',
  component: LiveMatchHistory,
  args: {
    courts: courts.slice(0, 2),
    matches,
    courtFilter: 'all',
    onCourtFilterChange: fn(),
    onOpenPlayer: fn(),
  },
  render: (args: LiveMatchHistoryProps) => {
    const [filter, setFilter] = useState(args.courtFilter)
    return <LiveMatchHistory {...args} courtFilter={filter} onCourtFilterChange={setFilter} />
  },
} satisfies Meta<typeof LiveMatchHistory>

export default meta
type Story = StoryObj<typeof meta>

/** Courts stacked, the latest match on top of each with a Latest chip. */
export const AllCourts: Story = { name: 'All courts' }

/** The filter shows one court's section. */
export const OneCourt: Story = { name: 'One court', args: { courtFilter: 'c2' } }

/** Nothing finished yet. */
export const Empty: Story = { args: { matches: [] } }

/** A court that has hosted nothing shows its own line. */
export const CourtWithNone: Story = {
  name: 'A court with no matches',
  args: { courts },
}

/** An invalid match stays in its court, desaturated with the Invalid chip and no score. */
export const Invalid: Story = {
  args: {
    matches: matches.map((m) => (m.id === 'm3' ? { ...m, invalid: true, winningTeam: null } : m)),
  },
}

/** A 5v5 uses two courts, so it shows under both and counts on both pills. */
export const FiveVsFiveTwoCourts: Story = {
  name: '5v5 on two courts',
  args: {
    matches: [
      ...matches,
      {
        id: 'm6',
        number: 6,
        courtIds: ['c1', 'c2'],
        startedAt: at(56),
        endedAt: at(80),
        fun: true,
        teamA: team(0, 1, 2, 3, 4),
        teamB: team(5, 6, 7, 8, 9),
        winningTeam: 'A',
        score: { teamA: 21, teamB: 18 },
      },
    ],
  },
}

export const WithWinChance: Story = {
  args: {
    matches: matches.map((m, i) => ({
      ...m,
      winChance: { a: 39, b: 61, favored: 'B', strong: false } as const,
      upset: i === 0,
    })),
    onOpenWinChance: fn(),
  },
}
