import { leaderboardEntries } from '@rotra/data/fixtures/leaderboard-players'
import { JOSE_PLAYER_ID } from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MyPositionCard } from './MyPositionCard'

const josePosition = leaderboardEntries.findIndex((entry) => entry.id === JOSE_PLAYER_ID) + 1
const jose = leaderboardEntries[josePosition - 1]
if (!jose) throw new Error('Missing Jose fixture')
const meta = {
  title: 'Player/MyPositionCard',
  component: MyPositionCard,
  args: {
    fullName: jose.fullName,
    picture: { src: jose.pictureUrl ?? undefined },
    onOpenProfile: () => undefined,
  },
} satisfies Meta<typeof MyPositionCard>
export default meta
type Story = StoryObj<typeof meta>
export const Listed: Story = {
  args: { position: josePosition, levelLabel: 'Intermediate Low', onShowMyRow: () => undefined },
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
