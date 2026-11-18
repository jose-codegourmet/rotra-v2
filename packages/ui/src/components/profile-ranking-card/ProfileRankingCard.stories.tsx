import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { type ProfileLeaderboardPlace, ProfileRankingCard } from './ProfileRankingCard'

const ANNUAL = { period: 'year', position: 17, wins: 106 } satisfies ProfileLeaderboardPlace
const MONTHLY = { period: 'month', position: 24, wins: 12 } satisfies ProfileLeaderboardPlace
const WEEKLY = { period: 'week', position: 39, wins: 1 } satisfies ProfileLeaderboardPlace

const meta = {
  title: 'Player/ProfileRankingCard',
  component: ProfileRankingCard,
  args: {
    levelLabel: 'Intermediate High',
    leaderboardPlaces: [ANNUAL, MONTHLY, WEEKLY],
    onShare: fn(),
    onOpenRankDetail: fn(),
    onOpenLeaderboard: fn(),
  },
  decorators: [(Story) => <div className="mx-auto w-full max-w-[720px]">{Story()}</div>],
} satisfies Meta<typeof ProfileRankingCard>
export default meta
type Story = StoryObj<typeof meta>

export const ThreeLists: Story = {}
export const TwoLists: Story = { args: { leaderboardPlaces: [ANNUAL, WEEKLY] } }
export const OneList: Story = { args: { leaderboardPlaces: [ANNUAL], onShare: undefined } }
export const NoLists: Story = { args: { leaderboardPlaces: [] } }
export const Provisional: Story = {
  args: {
    leaderboardPlaces: [],
    status: { label: 'Provisional', tone: 'neutral' },
    rankText: 'This rank is still settling: 7 of 10 standard matches in the last three months.',
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const PhoneLight: Story = { globals: { theme: 'light', viewport: { value: 'phone' } } }
