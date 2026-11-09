import { joinRequests } from '@rotra/data/fixtures/joinRequests'
import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { JoinRequestCard, type JoinRequestCardProps } from './JoinRequestCard'

// Tonight's prepared session: 8 players per court × 4 courts, 17 on the roster.
const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')
const capacity =
  tonight.playersPerCourt *
  queueSessionFixtures.courts.filter((c) => c.sessionId === tonight.id).length
const openSlots = capacity - queueSessionFixtures.roster.length

// The first sample guest who sent a request from the session link.
const guest = joinRequests[0]
if (!guest) throw new Error('Join request fixture missing')

const meta = {
  title: 'Queue/JoinRequestCard',
  component: JoinRequestCard,
  decorators: [
    (Story) => (
      <div className="max-w-[640px]">
        <Story />
      </div>
    ),
  ],
  args: {
    variant: 'open',
    openSlots,
    capacity,
    skillMix: { beginner: 5, intermediate: 8, advanced: 4 },
    onRequestToJoin: fn(),
  },
} satisfies Meta<JoinRequestCardProps>

export default meta
type Story = StoryObj<JoinRequestCardProps>

/** "N slots left" with Request to join. */
export const Open: Story = {}

/** Exactly one available slot. */
export const OneSlotLeft: Story = { args: { variant: 'open', openSlots: 1, capacity } }

/** Every slot is taken: confirmed guests join the waitlist; Request to join stays. */
export const Full: Story = { args: { variant: 'full', onRequestToJoin: fn() } }

export const Active: Story = { args: { variant: 'active', onRequestToJoin: fn() } }

/** No confirmed players: the skill mix bar is hidden. */
export const EmptyRoster: Story = {
  args: {
    variant: 'open',
    openSlots,
    capacity,
    skillMix: { beginner: 0, intermediate: 0, advanced: 0 },
    onRequestToJoin: fn(),
  },
}

/** An offline visitor: sending needs internet, so Request to join is disabled */
export const Offline: Story = {
  args: { variant: 'open', openSlots, capacity, onRequestToJoin: fn(), disabled: true },
}

/** Accept join requests is off for this session. */
export const Off: Story = { args: { variant: 'off' } }

/** This visitor's request is waiting for the Queue Master. */
export const Sent: Story = { args: { variant: 'sent', name: guest.name } }

export const ConfirmedSlot: Story = { args: { variant: 'confirmed-slot' } }

export const ConfirmedWaitlist: Story = {
  args: { variant: 'confirmed-waitlist', waitlistPosition: 2 },
}

export const Declined: Story = { args: { variant: 'declined' } }

/** Signed-in ROTRA player not in the session: one tap, no form. */
export const SignedInOpen: Story = {
  args: { variant: 'open', openSlots, capacity, signedInName: 'Jamie Cruz', onRequestToJoin: fn() },
}

/** Signed-in, every slot taken: confirmed players join the waitlist. */
export const SignedInFull: Story = {
  args: { variant: 'full', signedInName: 'Jamie Cruz', onRequestToJoin: fn() },
}

/** Signed-in request waiting: Cancel request replaces the one-tap button. */
export const SignedInSent: Story = {
  args: { variant: 'sent', name: 'Jamie Cruz', onCancelRequest: fn() },
}

export const SignedInWaitlisted: Story = {
  args: { variant: 'confirmed-waitlist', waitlistPosition: 2, signedIn: true },
}

/** Signed-in declined and requests off reuse the shared copy. */
export const SignedInDeclined: Story = { args: { variant: 'declined' } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
