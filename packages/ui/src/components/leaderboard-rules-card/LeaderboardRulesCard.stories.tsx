import type { Meta, StoryObj } from '@storybook/react-vite'
import { LeaderboardRulesCard } from './LeaderboardRulesCard'

const meta = {
  title: 'Player/LeaderboardRulesCard',
  component: LeaderboardRulesCard,
  args: { matchRequirement: 10, onOpenRankDetail: () => undefined },
} satisfies Meta<typeof LeaderboardRulesCard>
export default meta
type Story = StoryObj<typeof meta>
export const TenMatches: Story = {}
export const TwelveMatches: Story = { args: { matchRequirement: 12 } }
