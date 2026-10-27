import {
  rankExplanationNoRank,
  rankExplanationPlayer,
  rankExplanationStale,
} from '@rotra/data/fixtures/rank-explanation'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { RankExplanation } from './RankExplanation'

const meta = { title: 'Player/RankExplanation', component: RankExplanation } satisfies Meta<
  typeof RankExplanation
>
export default meta
type Story = StoryObj<typeof meta>
export const NoPlayer: Story = { args: { assessmentWeightPercent: 70 } }
export const OnLeaderboard: Story = {
  args: { assessmentWeightPercent: 70, player: rankExplanationPlayer },
}
export const NeedsReassessment: Story = {
  args: { assessmentWeightPercent: 70, player: rankExplanationStale },
}
export const NoRankYet: Story = {
  args: { assessmentWeightPercent: 70, player: rankExplanationNoRank },
}
export const WeightChangedTo60: Story = {
  args: { assessmentWeightPercent: 60, player: rankExplanationPlayer },
}
