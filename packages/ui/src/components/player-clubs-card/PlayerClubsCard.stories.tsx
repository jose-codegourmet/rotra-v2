import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlayerClubsCard } from './PlayerClubsCard'

const meta = {
  title: 'Player/PlayerClubsCard',
  component: PlayerClubsCard,
  args: {
    isOwn: true,
    clubs: [
      {
        id: 'c1',
        name: 'Lahug Smash Club',
        initials: 'LS',
        joinedVia: 'club_link',
        clubPageHref: '#',
      },
      {
        id: 'c2',
        name: 'Cebu Badminton Club',
        initials: 'CB',
        joinedVia: 'session_link',
        clubPageHref: '#',
      },
    ],
  },
} satisfies Meta<typeof PlayerClubsCard>
export default meta
type Story = StoryObj<typeof meta>
export const TwoClubs: Story = { args: {} }
export const OtherPlayer: Story = {
  args: {
    isOwn: false,
    clubs: [
      { id: 'c1', name: 'Lahug Smash Club', initials: 'LS', clubPageHref: '#' },
      { id: 'c2', name: 'Cebu Badminton Club', initials: 'CB', clubPageHref: '#' },
    ],
  },
}
export const Empty: Story = { args: { clubs: [] } }
export const OtherPlayerEmpty: Story = { args: { isOwn: false, clubs: [] } }
export const LongName: Story = {
  args: {
    clubs: [
      {
        id: 'c1',
        name: 'The very long badminton club name in Cebu City',
        initials: 'CB',
        joinedVia: 'club_added',
        clubPageHref: '#',
      },
    ],
  },
}
export const TwoClubsLight: Story = { globals: { theme: 'light' } }
export const OtherPlayerLight: Story = { ...OtherPlayer, globals: { theme: 'light' } }
export const OtherPlayerEmptyLight: Story = { ...OtherPlayerEmpty, globals: { theme: 'light' } }
