import type { Meta, StoryObj } from '@storybook/react-vite'
import { JoinClubCard } from './JoinClubCard'

const meta = {
  title: 'Player/JoinClubCard',
  component: JoinClubCard,
  args: { clubName: 'Lahug Smashers', clubInitials: 'LS', onJoin: () => {}, onNotNow: () => {} },
} satisfies Meta<typeof JoinClubCard>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = { args: {} }
export const Pending: Story = { args: { pending: true } }
export const AlreadyIn: Story = { args: { alreadyIn: true } }
export const LongName: Story = {
  args: { clubName: 'The very long badminton club name in Cebu City' },
}
export const Failure: Story = { args: { error: "Couldn't join the club. Try again." } }
