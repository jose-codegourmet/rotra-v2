import { leaderboardEntries } from '@rotra/data/fixtures/leaderboard-players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { TopThreePodium } from './TopThreePodium'

const [first, second, third] = leaderboardEntries
if (!first || !second || !third) throw new Error('Missing leaderboard fixtures.')
const entries = [first, second, third].map((entry) => ({
  fullName: entry.fullName,
  nickname: entry.nickname,
  picture: { src: entry.pictureUrl ?? undefined },
  levelLabel: 'Advanced High',
})) as unknown as Parameters<typeof TopThreePodium>[0]['entries']
const meta = {
  title: 'Player/TopThreePodium',
  component: TopThreePodium,
  args: { entries, totalPlayers: 1_284, onSelect: () => undefined },
} satisfies Meta<typeof TopThreePodium>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const MeInFirst: Story = {
  args: { entries: [{ ...entries[0], isMe: true }, entries[1], entries[2]] },
}
