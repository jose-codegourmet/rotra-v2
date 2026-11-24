import { liveStandingsFixture } from '@rotra/data/fixtures/live-standings'
import { sessionRecordFixture } from '@rotra/data/fixtures/session-record'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import {
  LiveLeaderboard,
  type LiveLeaderboardPlayer,
  type LiveLeaderboardProps,
  type LiveLeaderboardRow,
} from './LiveLeaderboard'

type FixtureRow = (typeof liveStandingsFixture.rows)[number]

/** Story-only grouping of the fixtures: same wins and losses share a position (1, 1, 3). */
function group(fixtureRows: FixtureRow[]): LiveLeaderboardRow[] {
  const out: LiveLeaderboardRow[] = []
  fixtureRows.forEach((r, i) => {
    const player: LiveLeaderboardPlayer = { playerId: r.playerId, name: r.name, level: r.level }
    const last = out[out.length - 1]
    if (last && last.wins === r.wins && last.losses === r.losses) {
      last.players.push(player)
      last.games = {
        min: Math.min(typeof last.games === 'number' ? last.games : last.games.min, r.games),
        max: Math.max(typeof last.games === 'number' ? last.games : last.games.max, r.games),
      }
    } else
      out.push({
        position: i + 1,
        players: [player],
        wins: r.wins,
        losses: r.losses,
        games: r.games,
      })
  })
  return out
}

const NAMES = [
  'Maya Santos',
  'Ben Cruz',
  'Jose Buctuanon',
  'Ana Lim',
  'Carlo Reyes',
  'Bea Villanueva-Dela Cruz',
  'Paolo Tan',
  'Lia Mendoza',
]
const LEVELS: LiveLeaderboardPlayer['level'][] = [
  'intermediate_mid',
  'intermediate_high',
  'advanced_low',
  'intermediate_low',
]
const player = (i: number): LiveLeaderboardPlayer => ({
  playerId: `p${i}`,
  name: NAMES[i % NAMES.length] ?? 'Player',
  level: LEVELS[i % LEVELS.length] ?? null,
})
const players = (from: number, count: number) =>
  Array.from({ length: count }, (_, k) => player(from + k))

/** A leader, then `count` players sharing position 2, then the next position skips the shared places. */
const sharing = (count: number, games: LiveLeaderboardRow['games'] = 6): LiveLeaderboardRow[] => [
  { position: 1, players: players(0, 1), wins: 6, losses: 0, games: 6 },
  { position: 2, players: players(1, count), wins: 4, losses: 2, games },
  { position: 2 + count, players: players(1 + count, 1), wins: 1, losses: 5, games: 6 },
]

const meta = {
  title: 'Queue/LiveLeaderboard',
  component: LiveLeaderboard,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[1240px]">
        <Story />
      </div>
    ),
  ],
  args: {
    rows: group(liveStandingsFixture.rows),
    minimumGames: liveStandingsFixture.minimumGames,
    onOpenProfile: fn(),
  },
} satisfies Meta<LiveLeaderboardProps>

export default meta
type Story = StoryObj<LiveLeaderboardProps>

/** The console fixture grouped by wins and losses: players on the same record share a position, ordered by name inside it. */
export const Standings: Story = {}

/** The console fixture as is: three players at 1–0 and four at 0–1. */
export const Ties: Story = { args: { rows: group(liveStandingsFixture.tiedRows) } }

export const Empty: Story = { args: { rows: [] } }

/** One labelled card per row at 375 px. */
export const PhoneCards: Story = { globals: { viewport: { value: 'phone' } } }

export const PhoneEmpty: Story = {
  args: { rows: [] },
  globals: { viewport: { value: 'phone' } },
}

export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }

/** The official standings of Thursday Open Play on the session record's Results tab. */
export const Record: Story = {
  args: { variant: 'record', rows: group(sessionRecordFixture.standings) },
}

export const RecordEmpty: Story = { args: { variant: 'record', rows: [] } }

export const RecordPhone: Story = {
  args: { variant: 'record', rows: group(sessionRecordFixture.standings) },
  globals: { viewport: { value: 'phone' } },
}

/** One player alone on position 2: the unchanged row. */
export const SharedOne: Story = { args: { rows: sharing(1) }, globals: { theme: 'dark' } }
export const SharedOneLight: Story = { args: { rows: sharing(1) }, globals: { theme: 'light' } }

/** Two players share position 2; the next position is 4. */
export const SharedTwo: Story = { args: { rows: sharing(2) }, globals: { theme: 'dark' } }
export const SharedTwoLight: Story = { args: { rows: sharing(2) }, globals: { theme: 'light' } }

/** Three share position 2 (here a tied second place, tinted with the top three). */
export const SharedThree: Story = { args: { rows: sharing(3) }, globals: { theme: 'dark' } }
export const SharedThreeLight: Story = { args: { rows: sharing(3) }, globals: { theme: 'light' } }

/** Six share a position, the games differ inside it (5–6), and a long name wraps. */
export const SharedSix: Story = {
  args: { rows: sharing(6, { min: 5, max: 6 }) },
  globals: { theme: 'dark' },
}
export const SharedSixLight: Story = {
  args: { rows: sharing(6, { min: 5, max: 6 }) },
  globals: { theme: 'light' },
}

export const SharedSixPhone: Story = {
  args: { rows: sharing(6, { min: 5, max: 6 }) },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}

export const SharedRecordSix: Story = {
  args: { variant: 'record', rows: sharing(6, { min: 5, max: 6 }) },
  globals: { theme: 'light' },
}

export const SharedRecordSixPhone: Story = {
  args: { variant: 'record', rows: sharing(6, { min: 5, max: 6 }) },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}

/** Every picture has a ring in its level band: Beginner blue, Intermediate yellow, Advanced red, grey with no level. */
export const Rings: Story = {
  args: {
    rows: [
      {
        position: 1,
        players: [
          { playerId: 'r1', name: 'Maya Santos', level: 'beginner_mid' },
          { playerId: 'r2', name: 'Ben Cruz', level: null },
        ],
        wins: 4,
        losses: 1,
        games: 5,
      },
      {
        position: 3,
        players: [{ playerId: 'r3', name: 'Ana Lim', level: 'intermediate_mid' }],
        wins: 3,
        losses: 2,
        games: 5,
      },
      {
        position: 4,
        players: [{ playerId: 'r4', name: 'Carlo Reyes', level: 'advanced_low' }],
        wins: 2,
        losses: 3,
        games: 5,
      },
    ],
  },
  globals: { theme: 'dark' },
}
export const RingsLight: Story = { ...Rings, globals: { theme: 'light' } }

/** A tied row: each stacked picture keeps its own level ring. */
export const TiedStacked: Story = {
  args: {
    rows: [
      {
        position: 1,
        players: [
          { playerId: 't1', name: 'Maya Santos', level: 'beginner_low' },
          { playerId: 't2', name: 'Ben Cruz', level: 'intermediate_high' },
          { playerId: 't3', name: 'Jose Buctuanon', level: 'advanced_low' },
          { playerId: 't4', name: 'Ana Lim', level: null },
        ],
        wins: 4,
        losses: 0,
        games: 4,
      },
    ],
  },
  globals: { theme: 'dark' },
}
export const TiedStackedLight: Story = { ...TiedStacked, globals: { theme: 'light' } }
export const TiedStackedPhone: Story = {
  ...TiedStacked,
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}
