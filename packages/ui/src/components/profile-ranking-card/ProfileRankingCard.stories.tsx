import { profileLeaderboardStoryPlaces } from '@rotra/data/fixtures/rank-states'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ProfileRankingCard } from './ProfileRankingCard'

const [annual, monthly, weekly] = profileLeaderboardStoryPlaces

const meta = {
  title: 'Player/ProfileRankingCard',
  component: ProfileRankingCard,
  args: {
    levelLabel: 'Intermediate High',
    leaderboardPlaces: [annual, monthly, weekly],
    onShare: fn(),
    onOpenRankDetail: fn(),
    onOpenLeaderboard: fn(),
  },
  decorators: [(Story) => <div className="mx-auto w-full max-w-[720px]">{Story()}</div>],
} satisfies Meta<typeof ProfileRankingCard>
export default meta
type Story = StoryObj<typeof meta>

export const ThreeLists: Story = {}
export const TwoLists: Story = { args: { leaderboardPlaces: [annual, weekly] } }
export const OneList: Story = { args: { leaderboardPlaces: [annual], onShare: undefined } }
export const NoLists: Story = { args: { leaderboardPlaces: [] } }
export const Provisional: Story = {
  args: {
    leaderboardPlaces: [],
    status: { label: 'Provisional', tone: 'neutral' },
    rankText: 'This rank is still settling: 7 of 10 standard matches in the last three months.',
  },
}
export const NeedsReassessment: Story = {
  args: {
    leaderboardPlaces: [annual],
    status: { label: 'Needs reassessment', tone: 'warn' },
    rankText:
      'Last played more than three months ago, so this rank is out of date. A club gives you a fresh assessment to bring it up to date.',
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const PhoneLight: Story = { globals: { theme: 'light', viewport: { value: 'phone' } } }
