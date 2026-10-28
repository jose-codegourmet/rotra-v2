import { clubPlayers } from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ParticipantCard } from './ParticipantCard'

const registered = clubPlayers.find((p) => p.identity === 'registered')
const guest = clubPlayers.find((p) => p.identity === 'guest')
if (!registered || !guest) throw new Error('Player fixtures missing')

const meta = {
  title: 'Queue/PublicSession/PublicParticipants/ParticipantCard',
  component: ParticipantCard,
  decorators: [
    (Story) => (
      <div className="w-[160px]">
        <Story />
      </div>
    ),
  ],
  args: { name: registered.fullName, hasProfile: true },
} satisfies Meta<typeof ParticipantCard>

export default meta
type Story = StoryObj<typeof meta>

/** A registered or unclaimed player: initials and "Has a ROTRA profile". */
export const HasProfile: Story = {}

/** A guest: initials and no label. */
export const Guest: Story = { args: { name: guest.fullName, hasProfile: false } }

export const LongName: Story = {
  args: { name: `${registered.fullName} Bautista Villareal de los Reyes` },
}
