import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { EligibilityCard } from './EligibilityCard'

const meta = {
  title: 'Player/EligibilityCard',
  component: EligibilityCard,
  args: { recentCount: 10, matchRequirement: 10 },
} satisfies Meta<typeof EligibilityCard>

export default meta
type Story = StoryObj<typeof meta>
export const Qualifies: Story = {}
export const BelowThreshold: Story = { args: { recentCount: 7 } }
export const NeedsReassessment: Story = { args: { needsReassessment: true } }
export const ThresholdChanged: Story = { args: { recentCount: 10, matchRequirement: 12 } }
/** The profile: the shared rank in the head (own profile, so Share shows) */
export const WithRankHead: Story = {
  args: {
    recentCount: 6,
    rank: {
      levelLabel: 'Intermediate Mid',
      status: { label: 'Provisional', tone: 'neutral' },
      onShare: fn(),
      onOpenRankDetail: fn(),
    },
    rankText: 'No overall position yet. 6 of 10 standard matches in the last three months.',
    sentence:
      '4 more standard matches in the next few weeks would put you on the leaderboard. Older matches drop out of the count as they pass three months.',
  },
}
export const WithRankHeadLight: Story = { ...WithRankHead, globals: { theme: 'light' } }
/** Not ranked yet: the label is muted, no Share */
export const NotCalculated: Story = {
  args: {
    recentCount: 2,
    rank: {
      levelLabel: null,
      status: { label: 'Not calculated', tone: 'neutral' },
      onOpenRankDetail: fn(),
    },
    rankText:
      'ROTRA calculates a rank once a club has assessed Mara and a session with that assessment is done. Until then there is no rank to show.',
  },
}
export const ReassessmentWithRank: Story = {
  args: {
    recentCount: 0,
    needsReassessment: true,
    rank: {
      levelLabel: 'Advanced Low',
      status: { label: 'Needs reassessment', tone: 'warn' },
      onOpenRankDetail: fn(),
    },
    rankText:
      'Last played more than three months ago, so this rank is out of date and not on the leaderboard.',
  },
}
export const Phone: Story = { ...WithRankHead, globals: { viewport: { value: 'phone' } } }
