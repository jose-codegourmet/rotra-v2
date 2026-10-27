import { leaderboardEntries } from '@rotra/data/fixtures/leaderboard-players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LeaderboardRow } from './LeaderboardRow'

const first = leaderboardEntries[0]
const fourth = leaderboardEntries[3]
const migs = leaderboardEntries[127]
if (!first || !fourth || !migs) throw new Error('Missing leaderboard fixtures.')
const noop = () => undefined

const meta = {
  title: 'Player/LeaderboardRow',
  component: LeaderboardRow,
  args: {
    position: 4,
    fullName: fourth.fullName,
    nickname: fourth.nickname,
    levelLabel: 'Advanced High',
    onSelect: noop,
  },
} satisfies Meta<typeof LeaderboardRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Me: Story = {
  args: {
    position: 128,
    fullName: migs.fullName,
    nickname: migs.nickname,
    levelLabel: 'Advanced Low',
    isMe: true,
  },
}
export const Medal1: Story = {
  args: {
    position: 1,
    fullName: first.fullName,
    nickname: first.nickname,
    levelLabel: 'Advanced High',
    variant: 'medal-1',
  },
}
export const Medal2: Story = {
  args: { position: 2, fullName: 'Theo Ramos', levelLabel: 'Advanced High', variant: 'medal-2' },
}
export const Medal3: Story = {
  args: {
    position: 3,
    fullName: 'Carla Dimaculangan',
    nickname: 'Tintin',
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
