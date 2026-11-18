import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminPlayerClubs } from './AdminPlayerClubs'

const meta = {
  title: 'Admin/AdminPlayerClubs',
  component: AdminPlayerClubs,
  args: { clubs: [] },
} satisfies Meta<typeof AdminPlayerClubs>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }

/** An unclaimed player saved by two clubs, each with its own name for them. */
export const SavedByTwoClubs: Story = {
  args: {
    savedBy: [
      { club: 'Talamban Racket Club', name: 'Nina Ocampo' },
      { club: 'IT Park Badminton Club', name: 'Nina O.' },
    ],
  },
}
export const SavedByTwoClubsLight: Story = { ...SavedByTwoClubs, globals: { theme: 'light' } }
