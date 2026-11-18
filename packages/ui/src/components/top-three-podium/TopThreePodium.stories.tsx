import { leaderboardEntries } from '@rotra/data/fixtures/leaderboard-players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { type PodiumEntry, TopThreePodium } from './TopThreePodium'

const [first, second, third] = leaderboardEntries
if (!first || !second || !third) throw new Error('Missing leaderboard fixtures.')

function podiumEntry(entry: (typeof leaderboardEntries)[number], wins: number): PodiumEntry {
  return {
    id: entry.id,
    fullName: entry.fullName,
    nickname: entry.nickname,
    picture: { src: entry.pictureUrl ?? undefined },
    wins,
  }
}

const annual = [podiumEntry(first, 118), podiumEntry(second, 117), podiumEntry(third, 116)] as const
const monthly = [podiumEntry(first, 14), podiumEntry(second, 13), podiumEntry(third, 12)] as const
const weekly = [podiumEntry(first, 5), podiumEntry(second, 4), podiumEntry(third, 4)] as const

const meta = {
  title: 'Player/TopThreePodium',
  component: TopThreePodium,
  args: { entries: annual, period: 'year', dateLabel: '2026', onSelect: () => undefined },
} satisfies Meta<typeof TopThreePodium>

export default meta
type Story = StoryObj<typeof meta>
export const Annual: Story = {}
export const Monthly: Story = {
  args: { entries: monthly, period: 'month', dateLabel: 'November 2026' },
}
export const Weekly: Story = {
  args: { entries: weekly, period: 'week', dateLabel: 'Nov 16 to Nov 22' },
}
export const MeInFirst: Story = {
  args: { entries: [{ ...annual[0], isMe: true }, annual[1], annual[2]] },
}
export const Masked: Story = {
  args: {
    entries: [
      {
        ...annual[0],
        fullName: 'J*** A***',
        nickname: null,
        picture: undefined,
        masked: true,
        disabled: true,
      },
      annual[1],
      annual[2],
    ],
  },
}
