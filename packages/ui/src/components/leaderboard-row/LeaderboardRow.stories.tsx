import { leaderboardEntries } from '@rotra/data/fixtures/leaderboard-players'
import { JOSE_PLAYER_ID, storyIdentityPlayers } from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LeaderboardRow } from './LeaderboardRow'

const [first, second, third, fourth] = leaderboardEntries
const jose = leaderboardEntries.find((entry) => entry.id === JOSE_PLAYER_ID)
if (!first || !second || !third || !fourth || !jose) {
  throw new Error('Missing leaderboard fixtures.')
}

function identity(entry: (typeof leaderboardEntries)[number]) {
  return {
    fullName: entry.fullName,
    nickname: entry.nickname,
    picture: { src: entry.pictureUrl ?? undefined },
  }
}

const meta = {
  title: 'Player/LeaderboardRow',
  component: LeaderboardRow,
  decorators: [(Story) => <div className="pt-12">{Story()}</div>],
  args: {
    ...identity(fourth),
    period: 'week',
    position: 4,
    previousPosition: 7,
    wins: 3,
    onSelect: () => undefined,
  },
} satisfies Meta<typeof LeaderboardRow>

export default meta
type Story = StoryObj<typeof meta>

export const Up: Story = {}
export const Down: Story = { args: { period: 'month', position: 7, previousPosition: 5, wins: 12 } }
export const Same: Story = { args: { period: 'year', previousPosition: 4, wins: 115 } }
export const New: Story = { args: { previousPosition: null, wins: 1 } }
export const NewWithTooltip: Story = {
  ...New,
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getByRole('button'))
  },
}
export const Flash: Story = { args: { flash: true } }
export const Me: Story = {
  args: {
    ...identity(jose),
    period: 'year',
    position: 17,
    previousPosition: 22,
    wins: 106,
    isMe: true,
  },
}
export const Medal1: Story = {
  args: { ...identity(first), position: 1, previousPosition: 2, wins: 5, variant: 'medal-1' },
}
export const Medal2: Story = {
  args: { ...identity(second), position: 2, previousPosition: 1, wins: 4, variant: 'medal-2' },
}
export const Medal3: Story = {
  args: { ...identity(third), position: 3, previousPosition: 3, wins: 4, variant: 'medal-3' },
}
export const LongNameAndNickname: Story = {
  args: {
    position: 50,
    fullName: 'Maximiliano Dimaculangan Evangelista',
    nickname: 'The Unstoppable Shuttle Commander',
    wins: 1,
  },
}
export const Masked: Story = {
  args: {
    fullName: 'J*** A***',
    nickname: null,
    picture: undefined,
    masked: true,
    onSelect: undefined,
  },
}
export const Unclaimed: Story = {
  args: {
    fullName: storyIdentityPlayers.unclaimed.fullName,
    nickname: null,
    picture: undefined,
    unclaimed: true,
  },
}
