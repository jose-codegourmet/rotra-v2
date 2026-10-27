import type { Meta, StoryObj } from '@storybook/react-vite'
import { MyPositionCard } from './MyPositionCard'

const meta = {
  title: 'Player/MyPositionCard',
  component: MyPositionCard,
  args: { fullName: 'Miguel Santos', onOpenProfile: () => undefined },
} satisfies Meta<typeof MyPositionCard>
export default meta
type Story = StoryObj<typeof meta>
export const Listed: Story = {
  args: { position: 128, levelLabel: 'Advanced Low', onShowMyRow: () => undefined },
}
export const NotListed: Story = {
  args: {
    status: {
      label: 'Not yet',
      tone: 'warn',
      sentence: 'Play more completed standard matches to qualify.',
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
