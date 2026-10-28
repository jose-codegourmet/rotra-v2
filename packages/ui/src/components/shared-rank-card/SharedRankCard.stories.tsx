import { joseRankStates } from '@rotra/data/fixtures/rank-states'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SharedRankCard } from './SharedRankCard'

const meta = {
  title: 'Player/SharedRankCard',
  component: SharedRankCard,
  args: { ...joseRankStates.onLeaderboard, subject: 'you', onOpenRankDetail: () => undefined },
} satisfies Meta<typeof SharedRankCard>

export default meta
type Story = StoryObj<typeof meta>
export const OnLeaderboard: Story = {}
export const Provisional: Story = { args: joseRankStates.belowThreshold }
export const NeedsReassessment: Story = { args: joseRankStates.needsReassessment }
export const NotCalculated: Story = { args: joseRankStates.noRankYet }
