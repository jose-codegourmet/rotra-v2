import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import { clubPlayers, storyIdentityPlayers } from '@rotra/data/fixtures/players'
import { maskPublicName, publicLevel } from '@rotra/data/public-session/rules'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ParticipantCard } from './ParticipantCard'

const beginner = clubPlayers.find((p) => p.playingLevel?.startsWith('beginner'))
const intermediate = clubPlayers.find((p) => p.playingLevel?.startsWith('intermediate'))
const advanced = clubPlayers.find((p) => p.playingLevel?.startsWith('advanced'))
if (!beginner || !intermediate || !advanced) throw new Error('Player level fixtures missing')

const meta = {
  title: 'Queue/PublicSession/PublicParticipants/ParticipantCard',
  component: ParticipantCard,
  decorators: [
    (Story) => (
      <div className="w-[100px] pt-2">
        <Story />
      </div>
    ),
  ],
  args: { name: maskPublicName(beginner.fullName), ...publicLevel(beginner.playingLevel) },
} satisfies Meta<typeof ParticipantCard>

export default meta
type Story = StoryObj<typeof meta>

export const Beginner: Story = {}
export const Intermediate: Story = {
  args: { name: maskPublicName(intermediate.fullName), ...publicLevel(intermediate.playingLevel) },
}
export const Advanced: Story = {
  args: { name: maskPublicName(advanced.fullName), ...publicLevel(advanced.playingLevel) },
}
export const NoLevel: Story = {
  args: { name: maskPublicName(storyIdentityPlayers.guest.fullName), ...publicLevel(null) },
}
export const Picture: Story = {
  args: { pictureUrl: playerProfiles.find((p) => p.playerId === beginner.playerId)?.picture },
}
export const Waitlisted: Story = { args: { waitlistPosition: 12 } }
export const LongMaskedName: Story = {
  args: { name: maskPublicName(`${beginner.fullName} Bautista Villareal de los Reyes`) },
}
export const Light: Story = { globals: { theme: 'light' } }
