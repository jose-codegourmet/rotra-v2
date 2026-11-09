import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlayerClubsCard } from './PlayerClubsCard'

const meta = {
  title: 'Player/PlayerClubsCard',
  component: PlayerClubsCard,
  args: {
    clubs: [
      {
        id: 'c1',
        name: 'Lahug Smash Club',
        initials: 'LS',
        joinedVia: 'club_link',
        reportHref: 'mailto:support@rotra.example',
      },
      {
        id: 'c2',
        name: 'Cebu Badminton Club',
        initials: 'CB',
        joinedVia: 'session_link',
        reportHref: 'mailto:support@rotra.example',
      },
    ],
    onLeave: () => {},
  },
} satisfies Meta<typeof PlayerClubsCard>
export default meta
type Story = StoryObj<typeof meta>
export const TwoClubs: Story = { args: {} }
export const Empty: Story = { args: { clubs: [] } }
export const LongName: Story = {
  args: {
    clubs: [
      {
        id: 'c1',
        name: 'The very long badminton club name in Cebu City',
        initials: 'CB',
        joinedVia: 'club_added',
        reportHref: 'mailto:support@rotra.example',
      },
    ],
  },
}
