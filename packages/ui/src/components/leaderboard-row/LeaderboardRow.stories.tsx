import { leaderboardEntries } from '@rotra/data/fixtures/leaderboard-players'
import { JOSE_PLAYER_ID } from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LeaderboardRow } from './LeaderboardRow'

const first = leaderboardEntries[0]
const second = leaderboardEntries[1]
const third = leaderboardEntries[2]
const fourth = leaderboardEntries[3]
const josePosition = leaderboardEntries.findIndex((entry) => entry.id === JOSE_PLAYER_ID) + 1
const jose = leaderboardEntries[josePosition - 1]
if (!first || !second || !third || !fourth || !jose)
  throw new Error('Missing leaderboard fixtures.')
const noop = () => undefined

const meta = {
  title: 'Player/LeaderboardRow',
  component: LeaderboardRow,
  args: {
    position: 4,
    fullName: fourth.fullName,
    nickname: fourth.nickname,
    picture: { src: fourth.pictureUrl ?? undefined },
    levelLabel: 'Advanced High',
    onSelect: noop,
  },
} satisfies Meta<typeof LeaderboardRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Me: Story = {
  args: {
    position: josePosition,
    fullName: jose.fullName,
    nickname: jose.nickname,
    picture: { src: jose.pictureUrl ?? undefined },
    levelLabel: 'Intermediate Low',
    isMe: true,
  },
}
export const Medal1: Story = {
  args: {
    position: 1,
    fullName: first.fullName,
    nickname: first.nickname,
    picture: { src: first.pictureUrl ?? undefined },
    levelLabel: 'Advanced High',
    variant: 'medal-1',
  },
}
export const Medal2: Story = {
  args: {
    position: 2,
    fullName: second.fullName,
    nickname: second.nickname,
    picture: { src: second.pictureUrl ?? undefined },
    levelLabel: 'Advanced High',
    variant: 'medal-2',
  },
}
export const Medal3: Story = {
  args: {
    position: 3,
    fullName: third.fullName,
    nickname: third.nickname,
    picture: { src: third.pictureUrl ?? undefined },
    levelLabel: 'Advanced High',
    variant: 'medal-3',
  },
}
export const LongNameAndNickname: Story = {
  args: {
    position: 1_284,
    fullName: 'Maximiliano Dimaculangan Evangelista',
    nickname: 'The Unstoppable Shuttle Commander',
    levelLabel: 'Beginner Low',
  },
}
