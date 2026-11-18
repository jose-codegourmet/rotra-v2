import { leaderboardEntries } from '@rotra/data/fixtures/leaderboard-players'
import { JOSE_PLAYER_ID } from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MyPositionCard } from './MyPositionCard'

const jose = leaderboardEntries.find((entry) => entry.id === JOSE_PLAYER_ID)
if (!jose) throw new Error('Missing Jose fixture')

const meta = {
  title: 'Player/MyPositionCard',
  component: MyPositionCard,
  args: {
    fullName: jose.fullName,
    picture: { src: jose.pictureUrl ?? undefined },
    period: 'year',
    onOpenProfile: () => undefined,
    onShowMyRow: () => undefined,
  },
} satisfies Meta<typeof MyPositionCard>
export default meta
type Story = StoryObj<typeof meta>

export const Listed: Story = { args: { position: 17, previousPosition: 22, wins: 106 } }
export const Monthly: Story = {
  args: { period: 'month', position: 43, previousPosition: 40, wins: 12 },
}
export const Weekly: Story = {
  args: { period: 'week', position: 39, previousPosition: null, wins: 1 },
}
export const BelowTop50: Story = { args: { wins: 87, cutoffWins: 93 } }
export const BelowTop50SameWins: Story = {
  args: { wins: 93, cutoffWins: 93, cutoffHasBetterWinRate: true },
}
export const BelowTop50SameWinsAndWinRate: Story = {
  args: { wins: 93, cutoffWins: 93, cutoffHasBetterWinRate: false },
}
export const ListedInitials: Story = { args: { ...Listed.args, picture: undefined } }
export const NoPosition: Story = {
  args: {
    status: {
      label: 'Provisional',
      tone: 'warn',
      sentence: 'This rank is still settling: 7 of 10 standard matches in the last three months.',
    },
  },
}
export const NeedsReassessment: Story = {
  args: {
    status: {
      label: 'Needs reassessment',
      tone: 'warn',
      sentence: 'Ask a club to reassess you.',
      needsReassessment: true,
    },
  },
}
