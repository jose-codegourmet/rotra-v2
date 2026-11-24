import type { PlayingLevel } from '@rotra/data/player/types'
import type { CourtPlayer } from '@rotra/ui/court-drawing'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import {
  SessionGamesDialog,
  type SessionGamesDialogProps,
  type SessionGamesMatch,
  type SessionGamesPlannedMatch,
  type SessionGamesTab,
} from './SessionGamesDialog'

const roster: [string, PlayingLevel | null][] = [
  ['Nina Reyes', 'intermediate_mid'],
  ['Ben Cruz', 'beginner_high'],
  ['Carla Diaz', 'advanced_low'],
  ['Dan Lim', null],
  ['Ella Tan', 'intermediate_low'],
  ['Finn Ong', 'beginner_mid'],
  ['Gia Sy', 'advanced_mid'],
  ['Hugo Lee', 'intermediate_high'],
]
const person = (i: number): CourtPlayer => {
  const [name, level] = roster[i % roster.length] as [string, PlayingLevel | null]
  return { id: `p${i}`, name, shortName: name.split(' ')[0] as string, level }
}
const team = (...ids: number[]) => ids.map(person)

// Session night: 7:00 PM in the club zone (UTC+8) is 11:00 UTC.
const T0 = Date.UTC(2026, 10, 24, 11, 0)
const at = (min: number) => T0 + min * 60_000

const nina = { ...person(0), photoUrl: undefined }

const matches: SessionGamesMatch[] = [
  {
    id: 'm3',
    number: 9,
    courtLabel: 'Court 2',
    startedAt: at(40),
    endedAt: at(58),
    counting: 'counts',
    teamA: team(0, 1),
    teamB: team(2, 3),
    winningTeam: 'B',
    score: { teamA: 17, teamB: 21 },
  },
  {
    id: 'm2',
    number: 5,
    courtLabel: 'Court 1',
    startedAt: at(20),
    endedAt: at(36),
    counting: 'not-counted',
    teamA: team(4, 5),
    teamB: team(0, 6),
    winningTeam: 'A',
    score: { teamA: 21, teamB: 15 },
    substitutionCredits: [{ outName: 'Hugo Lee', inName: 'Nina Reyes', creditTo: 'outgoing' }],
  },
  {
    id: 'm1',
    number: 2,
    courtLabel: 'Court 1',
    startedAt: at(0),
    endedAt: at(16),
    counting: 'invalid',
    teamA: team(0, 7),
    teamB: team(1, 2),
    winningTeam: null,
    score: null,
  },
]

const planned: SessionGamesPlannedMatch[] = [
  {
    id: 'q1',
    position: 1,
    matchesAhead: 0,
    formatLabel: 'Doubles',
    teamA: team(0, 3),
    teamB: team(4, 5),
  },
  {
    id: 'q2',
    position: 4,
    matchesAhead: 3,
    formatLabel: 'Doubles',
    teamA: team(0, 6),
    teamB: team(1, 7),
  },
]

const meta = {
  title: 'Queue/SessionGamesDialog',
  component: SessionGamesDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    player: nina,
    matches,
    planned,
    gamesPlayed: 3,
    onOpenProfile: fn(),
  },
  // The caller keeps the picked pill, so Back from a profile reopens the same one.
  render: (args: SessionGamesDialogProps) => {
    const [tab, setTab] = useState<SessionGamesTab>(args.tab ?? 'matches')
    return <SessionGamesDialog {...args} tab={tab} onTabChange={setTab} />
  },
} satisfies Meta<typeof SessionGamesDialog>

export default meta
type Story = StoryObj<typeof meta>

/** Finished matches latest first: Counts, Not counted (warn) and Invalid · not counted; the player's face has the warn outline and name pill. */
export const Matches: Story = {}
export const MatchesLight: Story = { globals: { theme: 'light' } }
export const MatchesPhone: Story = { globals: { viewport: { value: 'phone' } } }
export const MatchesPhoneLight: Story = {
  globals: { theme: 'light', viewport: { value: 'phone' } },
}

/** Games set by hand add “includes +N set by hand” and the Main Queue count. */
export const SetByHand: Story = { args: { gamesPlayed: 5, setByHand: 2 } }

/** The Planned queue pill: the waiting Main Queue matches, nearest first with the Nearest chip, drawn with VS. */
export const PlannedQueue: Story = { args: { tab: 'queue' } }
export const PlannedQueueLight: Story = { args: { tab: 'queue' }, globals: { theme: 'light' } }
export const PlannedQueuePhone: Story = {
  args: { tab: 'queue' },
  globals: { viewport: { value: 'phone' } },
}

/** On court now: “NAME is playing on Court 2 now (Match 18). It counts after Match done.” */
export const PlayingNow: Story = {
  args: { onCourt: { status: 'playing', courtLabel: 'Court 2', matchNumber: 18 } },
}

/** Getting ready reads “getting ready”. */
export const GettingReady: Story = {
  args: { onCourt: { status: 'getting-ready', courtLabel: 'Court 2', matchNumber: 18 } },
}

/** Playing, on the Planned queue pill (no “It counts…” sentence). */
export const PlayingNowPlannedQueue: Story = {
  args: {
    tab: 'queue',
    onCourt: { status: 'playing', courtLabel: 'Court 2', matchNumber: 18 },
  },
}

/** No finished matches yet. */
export const Empty: Story = {
  args: { matches: [], gamesPlayed: 0, planned: [] },
}
export const EmptyLight: Story = {
  args: { matches: [], gamesPlayed: 0, planned: [] },
  globals: { theme: 'light' },
}

/** Planned queue with none: “NAME isn't in the Main Queue right now.” */
export const EmptyPlannedQueue: Story = { args: { tab: 'queue', planned: [] } }
