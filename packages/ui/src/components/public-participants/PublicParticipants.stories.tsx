import type { ClubPlayer } from '@rotra/data/club-player/types'
import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import { clubPlayers } from '@rotra/data/fixtures/players'
import { maskPublicName, publicLevel } from '@rotra/data/public-session/rules'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PublicParticipants } from './PublicParticipants'

const toParticipant = (p: ClubPlayer) => ({
  id: p.id,
  name: maskPublicName(p.fullName),
  pictureUrl: playerProfiles.find((profile) => profile.playerId === p.playerId)?.picture,
  ...publicLevel(p.playingLevel),
})
const participants = clubPlayers.map(toParticipant)

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
    participants: participants.slice(0, 18),
    waitlist: participants.slice(18, 20),
    openSlots: 0,
    finished: false,
    acceptJoinRequests: true,
    onRequestToJoin: fn(),
  },
} satisfies Meta<typeof PublicParticipants>

export default meta
type Story = StoryObj<typeof meta>

/** All stories support both themes through the Theme toolbar. */
export const OverCap: Story = {}
export const UnderCap: Story = {
  args: { participants: participants.slice(0, 3), waitlist: [], openSlots: 5 },
}
export const OpenSlotsCapped: Story = {
  args: { participants: participants.slice(0, 3), waitlist: [], openSlots: 13 },
}
export const EmptyWithOpenSlots: Story = {
  args: { participants: [], waitlist: [], openSlots: 12 },
}
export const Empty: Story = { args: { participants: [], waitlist: [] } }
export const NinePlayers: Story = {
  args: { participants: participants.slice(0, 9), waitlist: [] },
}
/** Capped on phones only: wider screens show all ten with no prompt. */
export const TenPlayers: Story = {
  args: { participants: participants.slice(0, 10), waitlist: [] },
}
export const TwelvePlayers: Story = {
  args: { participants: participants.slice(0, 12), waitlist: [] },
}
export const ThirteenPlayers: Story = {
  args: { participants: participants.slice(0, 13), waitlist: [] },
}
export const RequestsOff: Story = { args: { acceptJoinRequests: false } }
export const Offline: Story = { args: { disabled: true } }
export const Finished: Story = { args: { finished: true, openSlots: 8 } }
export const FinishedEmpty: Story = {
  args: { participants: [], waitlist: [], finished: true, openSlots: 12 },
}
export const WaitlistUncapped: Story = {
  args: { participants: participants.slice(0, 3), waitlist: participants.slice(3, 18) },
}
export const LongMaskedNames: Story = {
  args: {
    participants: participants.slice(0, 6).map((p) => ({
      ...p,
      name: maskPublicName(`${p.name} Bautista Villareal de los Reyes`),
    })),
    waitlist: [],
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const Light: Story = { globals: { theme: 'light' } }

export const ConfirmedParticipant: Story = { args: { uncapped: true } }

/** Signed-in view: registered tiles show full name, nickname and a profile link; guest and unclaimed stay masked. */
const signedIn = participants.map((p, i) => {
  const registered = i % 3 !== 2
  return {
    ...p,
    name: registered ? (clubPlayers[i]?.fullName ?? p.name) : p.name,
    nickname: registered ? 'Nick' : undefined,
    masked: !registered,
    href: registered ? `/player/find/RTR-${String(i + 1).padStart(5, '0')}` : undefined,
  }
})
export const VisitorCapped: Story = { args: { participants: participants.slice(0, 18) } }
export const SignedInUncappedMixed: Story = {
  args: { participants: signedIn.slice(0, 18), waitlist: [], uncapped: true, participantCount: 18 },
}
export const ViewerConfirmed: Story = {
  args: {
    participants: signedIn.slice(0, 6).map((p, i) => ({ ...p, isViewer: i === 1 })),
    waitlist: [],
    uncapped: true,
  },
}
export const ViewerWaitlisted: Story = {
  args: {
    participants: signedIn.slice(0, 3),
    waitlist: signedIn.slice(3, 6).map((p, i) => ({ ...p, isViewer: i === 1 })),
    uncapped: true,
  },
}
export const ViewerNotInSession: Story = {
  args: { participants: signedIn.slice(0, 6), waitlist: signedIn.slice(6, 8), uncapped: true },
}
export const SignedInLight: Story = {
  args: {
    participants: signedIn.slice(0, 6).map((p, i) => ({ ...p, isViewer: i === 1 })),
    waitlist: signedIn.slice(6, 8),
    uncapped: true,
  },
  globals: { theme: 'light' },
}
