import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  SessionStandings,
  type SessionStandingsPlayer,
  type SessionStandingsRow,
} from './SessionStandings'

const NAMES = [
  'Maya Santos',
  'Ben Cruz',
  'Jose Buctuanon',
  'Y*** R***',
  'Ana Lim',
  'Carlo Reyes',
  'Bea Villanueva-Dela Cruz',
  'Paolo Tan',
  'Lia Mendoza',
  'Noel Garcia',
]
const player = (i: number, viewer = -1): SessionStandingsPlayer => {
  const name = NAMES[i % NAMES.length] ?? 'Player'
  return {
    id: `p${i}`,
    name,
    isViewer: i === viewer,
    onOpen: name.includes('*') ? undefined : () => {},
  }
}
const players = (from: number, count: number, viewer = -1) =>
  Array.from({ length: count }, (_, k) => player(from + k, viewer))

/** One player per position (the unchanged table), the viewer at position 3. */
const single: SessionStandingsRow[] = Array.from({ length: 6 }, (_, i) => ({
  id: String(i + 1),
  position: i + 1,
  players: players(i, 1, 2),
  wins: 6 - i,
  losses: i,
  games: 6,
}))

/** A leader, then `count` players sharing position 2, then the next position skips the shared places. */
const sharing = (
  count: number,
  viewer = -1,
  games: SessionStandingsRow['games'] = 6,
): SessionStandingsRow[] => [
  { id: '1', position: 1, players: players(0, 1, viewer), wins: 6, losses: 0, games: 6 },
  { id: '2', position: 2, players: players(1, count, viewer), wins: 4, losses: 2, games },
  {
    id: '3',
    position: 2 + count,
    players: players(1 + count, 2, viewer),
    wins: 1,
    losses: 5,
    games: 6,
  },
]
const meta = {
  title: 'Queue/SessionStandings',
  component: SessionStandings,
  args: {
    rows: single,
    viewer: { name: 'Jose Buctuanon' },
    onShareFinish: () => {},
    onShareLeaderboard: () => {},
  },
} satisfies Meta<typeof SessionStandings>
export default meta
type Story = StoryObj<typeof meta>

const noViewer = (rows: SessionStandingsRow[]) =>
  rows.map((row) => ({ ...row, players: row.players.map((p) => ({ ...p, isViewer: false })) }))

export const SignedIn: Story = { globals: { theme: 'dark' } }
export const SignedInLight: Story = { globals: { theme: 'light' } }
export const NoCountedGame: Story = { args: { rows: noViewer(single) } }
export const Visitor: Story = {
  args: {
    viewer: null,
    rows: noViewer(single).map((row) => ({
      ...row,
      players: row.players.map((p) => ({ ...p, onOpen: undefined })),
    })),
  },
}
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }

/** Two players share position 2 (next is 4). */
export const SharedTwo: Story = { args: { rows: sharing(2) }, globals: { theme: 'dark' } }
export const SharedTwoLight: Story = { args: { rows: sharing(2) }, globals: { theme: 'light' } }

/** Three share position 2. */
export const SharedThree: Story = { args: { rows: sharing(3) }, globals: { theme: 'dark' } }
export const SharedThreeLight: Story = { args: { rows: sharing(3) }, globals: { theme: 'light' } }

/** Six share position 2; games differ inside it (5–6). */
export const SharedSix: Story = {
  args: { rows: sharing(6, -1, { min: 5, max: 6 }) },
  globals: { theme: 'dark' },
}
export const SharedSixLight: Story = {
  args: { rows: sharing(6, -1, { min: 5, max: 6 }) },
  globals: { theme: 'light' },
}

/** The viewer (index 2) inside a position shared by three: tinted row, "(you)", "tied with 2 others". */
export const ViewerInSharedPosition: Story = {
  args: { rows: sharing(3, 2) },
  globals: { theme: 'dark' },
}
export const ViewerInSharedPositionLight: Story = {
  args: { rows: sharing(3, 2) },
  globals: { theme: 'light' },
}

/** The viewer in a position shared by two: "tied with 1 other". */
export const ViewerTiedWithOne: Story = {
  args: { rows: sharing(2, 1) },
  globals: { theme: 'light' },
}

export const ViewerInSharedSixPhone: Story = {
  args: { rows: sharing(6, 3, { min: 5, max: 6 }) },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}
