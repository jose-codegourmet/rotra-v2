import { adminPlayerDetailExamples } from '@rotra/data/fixtures/admin-players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminPlayerIdentityCard } from './AdminPlayerIdentityCard'

const { identity } = adminPlayerDetailExamples

const meta = {
  title: 'Admin/PlayerIdentityCard',
  component: AdminPlayerIdentityCard,
  args: identity.jose,
} satisfies Meta<typeof AdminPlayerIdentityCard>

export default meta
type Story = StoryObj<typeof meta>

/** No nickname: shows '—'. */
export const Default: Story = {}
export const WithNickname: Story = { args: identity.nicknamed }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const Light: Story = { globals: { theme: 'light' } }

/** An unclaimed player saved by two clubs, each with its own name for them. */
export const SavedByTwoClubs: Story = {
  args: {
    ...identity.jose,
    savedBy: [
      { club: 'Talamban Racket Club', name: 'Nina Ocampo' },
      { club: 'IT Park Badminton Club', name: 'Nina O.' },
    ],
  },
}
export const SavedByTwoClubsLight: Story = { ...SavedByTwoClubs, globals: { theme: 'light' } }
/** No RTR ID yet: the older note about the club's record. */
export const NotRegistered: Story = { args: { ...identity.jose, rtrId: null } }
