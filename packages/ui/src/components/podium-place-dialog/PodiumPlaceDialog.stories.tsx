import { leaderboardEntries } from '@rotra/data/fixtures/leaderboard-players'
import { Chip } from '@rotra/ui/chip'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PodiumPlaceDialog, type PodiumPlacePlayer } from './PodiumPlaceDialog'

const ROTRA_WEEKLY = 'Same wins and win rate: 7 wins and 88% each this week.'
const SESSION = 'Same wins and losses: 2 W and 1 L each.'

function weekly(from: number, count: number): PodiumPlacePlayer[] {
  return leaderboardEntries.slice(from, from + count).map((entry) => ({
    id: entry.id,
    name: entry.fullName,
    nickname: entry.nickname,
    pictureUrl: entry.pictureUrl,
    stats: [
      { value: '7', label: 'wins' },
      { value: '88%', label: 'win rate' },
    ],
  }))
}

function session(from: number, count: number, club?: string): PodiumPlacePlayer[] {
  return leaderboardEntries.slice(from, from + count).map((entry) => ({
    id: entry.id,
    name: entry.fullName,
    pictureUrl: entry.pictureUrl,
    club,
    stats: [
      { value: '2', label: 'W' },
      { value: '1', label: 'L' },
      { value: '3', label: 'games' },
      { value: '67%', label: 'win rate' },
    ],
    statsSpoken: '2 won, 1 lost, 3 games, 67% win rate',
  }))
}

const [me, unregistered, ...rest] = weekly(0, 4)
if (!me || !unregistered) throw new Error('Missing leaderboard fixtures.')
const rotraFour: PodiumPlacePlayer[] = [
  { ...me, tags: <Chip tone="accent">You</Chip> },
  { ...unregistered, tags: <Chip tone="warn">Not registered yet</Chip>, canOpen: false },
  ...rest,
]

const meta = {
  title: 'Shared/PodiumPlaceDialog',
  component: PodiumPlaceDialog,
  args: {
    open: true,
    onOpenChange: () => undefined,
    position: 1,
    players: rotraFour,
    description: ROTRA_WEEKLY,
    onOpenPlayer: () => undefined,
  },
  globals: { theme: 'dark' },
} satisfies Meta<typeof PodiumPlaceDialog>

export default meta
type Story = StoryObj<typeof meta>

/** ROTRA Player: a row with You, and a row that doesn't open. */
export const PlayerFour: Story = {}
export const PlayerFourLight: Story = { globals: { theme: 'light' } }
export const PlayerFourPhone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }

export const PlayerTwo: Story = { args: { position: 2, players: weekly(4, 2) } }

/** Queue session: W, L, games and win rate on one line. */
export const QueueSessionThree: Story = {
  args: { position: 2, players: session(0, 3), description: SESSION, statLayout: 'inline' },
}
export const QueueSessionThreeLight: Story = {
  args: { position: 2, players: session(0, 3), description: SESSION, statLayout: 'inline' },
  globals: { theme: 'light' },
}
export const QueueSessionPhone: Story = {
  args: { position: 2, players: session(0, 3), description: SESSION, statLayout: 'inline' },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}

/** Queue ROTRA board: the club under the name. */
export const QueueRotraWithClub: Story = {
  args: {
    position: 3,
    players: session(5, 2, 'Talamban Racket Club'),
    description: 'Same wins and win rate: 6 wins and 67% each this month.',
    statLayout: 'inline',
  },
}

/** No onOpenPlayer: plain rows (a visitor on the public page). */
export const NonInteractive: Story = { args: { onOpenPlayer: undefined } }
export const NonInteractiveLight: Story = {
  args: { onOpenPlayer: undefined },
  globals: { theme: 'light' },
}

/** The place emptied while the dialog was open. */
export const Empty: Story = { args: { players: [] } }
export const EmptyLight: Story = { args: { players: [] }, globals: { theme: 'light' } }
