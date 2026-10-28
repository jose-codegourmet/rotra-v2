import { leaderboardEntries } from '@rotra/data/fixtures/leaderboard-players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MyPositionCard } from './MyPositionCard'

const migs = leaderboardEntries[127]
if (!migs) throw new Error('Missing Migs fixture')
const meta = {
  title: 'Player/MyPositionCard',
  component: MyPositionCard,
  args: { fullName: migs.fullName, picture: { src: migs.pictureUrl ?? undefined }, onOpenProfile: () => undefined },
} satisfies Meta<typeof MyPositionCard>
export default meta
type Story = StoryObj<typeof meta>
export const Listed: Story = {
  args: { position: 128, levelLabel: 'Intermediate High', onShowMyRow: () => undefined },
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

export const ListedInitials: Story = { args: { ...Listed.args, picture: undefined } }
