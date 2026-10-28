import type { ClubPlayer } from '@rotra/data/club-player/types'
import { clubPlayers } from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PublicParticipants } from './PublicParticipants'

// The public projection of a saved player: name and whether a ROTRA profile exists. Pictures are not
// in the F06.2 fixtures, so every card shows initials.
const toParticipant = (p: ClubPlayer) => ({
  id: p.id,
  name: p.fullName,
  hasProfile: p.identity === 'registered' || p.identity === 'unclaimed',
})
const toWaitlisted = (p: ClubPlayer) => ({ id: p.id, name: p.fullName })

const meta = {
  title: 'Queue/PublicSession/PublicParticipants',
  component: PublicParticipants,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[760px]">
        <Story />
      </div>
    ),
  ],
  args: {
    participants: clubPlayers.slice(0, 18).map(toParticipant),
    waitlist: clubPlayers.slice(18, 20).map(toWaitlisted),
  },
} satisfies Meta<typeof PublicParticipants>

export default meta
type Story = StoryObj<typeof meta>

/** 18 confirmed people (registered, unclaimed and guests) and two on the waitlist. */
export const EighteenWithWaitlist: Story = {}

export const NoWaitlist: Story = { args: { waitlist: [] } }

/** Nobody has been added to the session yet. */
export const Empty: Story = { args: { participants: [], waitlist: [] } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }

export const LongNames: Story = {
  args: {
    participants: clubPlayers.slice(0, 6).map((p, i) => ({
      ...toParticipant(p),
      name: i % 2 ? `${p.fullName} Bautista Villareal de los Reyes` : p.fullName,
    })),
    waitlist: clubPlayers
      .slice(18, 20)
      .map((p) => ({ ...toWaitlisted(p), name: `${p.fullName} Bautista Villareal de los Reyes` })),
  },
  globals: { viewport: { value: 'phone' } },
}
