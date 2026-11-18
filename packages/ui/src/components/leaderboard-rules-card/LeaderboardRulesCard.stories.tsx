import type { Meta, StoryObj } from '@storybook/react-vite'
import { LeaderboardRulesCard } from './LeaderboardRulesCard'

const meta = {
  title: 'Player/LeaderboardRulesCard',
  component: LeaderboardRulesCard,
  args: { onOpenRankDetail: () => undefined },
} satisfies Meta<typeof LeaderboardRulesCard>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
