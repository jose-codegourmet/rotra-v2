import { migsRankStates } from '@rotra/data/fixtures/rank-states'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SharedRankCard } from './SharedRankCard'

const meta = {
  title: 'Player/SharedRankCard',
  component: SharedRankCard,
  args: { ...migsRankStates.onLeaderboard, subject: 'you', onOpenRankDetail: () => undefined },
} satisfies Meta<typeof SharedRankCard>

export default meta
type Story = StoryObj<typeof meta>
export const OnLeaderboard: Story = {}
export const Provisional: Story = { args: migsRankStates.belowThreshold }
export const NeedsReassessment: Story = { args: migsRankStates.needsReassessment }
export const NotCalculated: Story = { args: migsRankStates.noRankYet }
