import { leaderboardEntries } from '@rotra/data/fixtures/leaderboard-players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { type PodiumPlace, type PodiumPlayer, TopThreePodium } from './TopThreePodium'

function players(from: number, count: number, stat: string): PodiumPlayer[] {
  return leaderboardEntries.slice(from, from + count).map((entry) => ({
    id: entry.id,
    name: entry.fullName,
    nickname: entry.nickname,
    pictureUrl: entry.pictureUrl,
    stat,
  }))
}

const singles: PodiumPlace[] = [
  { position: 1, players: players(0, 1, '7 wins') },
  { position: 2, players: players(1, 1, '6 wins') },
  { position: 3, players: players(2, 1, '5 wins') },
]
const weekly = 'Top weekly · Nov 23 to Nov 29 · top 50'

const meta = {
  title: 'Player/TopThreePodium',
  component: TopThreePodium,
  args: {
    places: singles,
    caption: weekly,
    onOpenPlayer: () => undefined,
    onOpenPlace: () => undefined,
  },
  globals: { theme: 'dark' },
} satisfies Meta<typeof TopThreePodium>

export default meta
type Story = StoryObj<typeof meta>

export const ThreeSingles: Story = {}
export const ThreeSinglesLight: Story = { globals: { theme: 'light' } }
export const ThreeSinglesPhone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }

export const MeInFirst: Story = {
  args: {
    places: [
      {
        position: 1,
        players: players(0, 1, '7 wins').map((player) => ({ ...player, isMe: true })),
      },
      singles[1] as PodiumPlace,
      singles[2] as PodiumPlace,
    ],
  },
}

const sharedTwo: PodiumPlace[] = [
  { position: 1, players: players(0, 1, '7 wins') },
  { position: 2, players: players(1, 2, '6 wins') },
  { position: 3, players: players(3, 1, '5 wins') },
]
export const SharedTwo: Story = { args: { places: sharedTwo } }
export const SharedTwoLight: Story = { args: { places: sharedTwo }, globals: { theme: 'light' } }

const sharedThree: PodiumPlace[] = [
  { position: 1, players: players(0, 1, '7 wins') },
  { position: 2, players: players(1, 1, '6 wins') },
  { position: 3, players: players(2, 3, '5 wins') },
]
export const SharedThree: Story = { args: { places: sharedThree } }
export const SharedThreeLight: Story = {
  args: { places: sharedThree },
  globals: { theme: 'light' },
}

const sharedFour: PodiumPlace[] = [
  { position: 1, players: players(0, 4, '7 wins') },
  { position: 2, players: players(4, 7, '6 wins') },
  { position: 3, players: players(11, 3, '5 wins') },
]
export const SharedFourAndMore: Story = { args: { places: sharedFour } }
export const SharedFourAndMoreLight: Story = {
  args: { places: sharedFour },
  globals: { theme: 'light' },
}
export const SharedFourAndMorePhone: Story = {
  args: { places: sharedFour },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}

const fewer: PodiumPlace[] = [
  { position: 1, players: players(0, 1, '2 wins') },
  { position: 2, players: players(1, 1, '1 win') },
]
export const FewerThanThree: Story = { args: { places: fewer } }
export const FewerThanThreeLight: Story = { args: { places: fewer }, globals: { theme: 'light' } }

export const Empty: Story = { args: { places: [] } }
export const EmptyLight: Story = { args: { places: [] }, globals: { theme: 'light' } }

/** The Queue session podium: record lines and a muted session line. */
const session: PodiumPlace[] = [
  {
    position: 1,
    players: players(0, 1, '3 W · 1 L').map((player) => ({
      ...player,
      nickname: null,
      statSpoken: '3 wins, 1 loss',
    })),
  },
  {
    position: 2,
    players: players(1, 2, '2 W · 1 L').map((player) => ({
      ...player,
      statSpoken: '2 wins, 1 loss',
    })),
  },
  { position: 3, players: [] },
]
export const SessionRecord: Story = {
  args: { places: session, caption: 'This session · 8 players' },
}
export const SessionRecordLight: Story = {
  args: { places: session, caption: 'This session · 8 players' },
  globals: { theme: 'light' },
}

/** No callbacks: every place is a plain group, nothing opens. */
export const NonInteractive: Story = {
  args: { places: sharedTwo, onOpenPlayer: undefined, onOpenPlace: undefined },
}
export const NonInteractiveLight: Story = {
  args: { places: sharedTwo, onOpenPlayer: undefined, onOpenPlace: undefined },
  globals: { theme: 'light' },
}

/** A profile the viewer may not open: that single place is not a button. */
export const PlaceNotOpenable: Story = {
  args: {
    places: [
      {
        position: 1,
        players: players(0, 1, '7 wins').map((player) => ({ ...player, canOpen: false })),
      },
      singles[1] as PodiumPlace,
      singles[2] as PodiumPlace,
    ],
  },
}
