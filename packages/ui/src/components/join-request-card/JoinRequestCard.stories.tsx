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
/** After Start: online join requests are closed (visitors and signed-in players see the same card). */
export const Started: Story = { args: { variant: 'started' } }
export const StartedLight: Story = { args: { variant: 'started' }, globals: { theme: 'light' } }
export const StartedPhone: Story = {
  args: { variant: 'started' },
  globals: { viewport: { value: 'phone' } },
}

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

/** D-2026-11-11-02: the signed-in player picks Join a slot or Be waitlisted above the one tap. */
export const SignedInChoice: Story = {
  args: {
    variant: 'open',
    openSlots,
    capacity,
    signedInName: 'Jamie Cruz',
    placement: 'slot',
    onPlacementChange: fn(),
    onRequestToJoin: fn(),
  },
}
/** Every slot is taken: Join a slot is disabled and the waitlist is the only choice. */
export const SignedInChoiceFull: Story = {
  args: {
    variant: 'full',
    signedInName: 'Jamie Cruz',
    placement: 'waitlist',
    onPlacementChange: fn(),
    onRequestToJoin: fn(),
  },
}
export const SignedInChoiceFullLight: Story = { ...SignedInChoiceFull, globals: { theme: 'light' } }
/** D-2026-11-12-02: a club member on an upcoming session joins right away (Join as NAME). */
export const SignedInMember: Story = {
  args: {
    variant: 'open',
    openSlots,
    capacity,
    signedInName: 'Jamie Cruz',
    member: true,
    clubName: 'Lahug Smash Club',
    placement: 'slot',
    onPlacementChange: fn(),
    onRequestToJoin: fn(),
  },
}
export const SignedInMemberLight: Story = { ...SignedInMember, globals: { theme: 'light' } }
/** The member chose Be waitlisted: Join the waitlist as NAME. */
export const SignedInMemberWaitlist: Story = {
  args: { ...SignedInMember.args, variant: 'open', openSlots, capacity, placement: 'waitlist' },
}
/** Every slot is taken: the member goes straight onto the waitlist. */
export const SignedInMemberFull: Story = {
  args: {
    variant: 'full',
    signedInName: 'Jamie Cruz',
    member: true,
    clubName: 'Lahug Smash Club',
    placement: 'waitlist',
    onPlacementChange: fn(),
    onRequestToJoin: fn(),
  },
}
export const SignedInMemberPhone: Story = {
  ...SignedInMember,
  globals: { viewport: { value: 'phone' } },
}
/** A waitlist request waiting for the Queue Master. */
export const SignedInSentWaitlist: Story = {
  args: { variant: 'sent', name: 'Jamie Cruz', placement: 'waitlist', onCancelRequest: fn() },
}
/** Waitlisted while slots are open: Join from waitlist. */
export const SignedInWaitlistedOpenSlots: Story = {
  args: {
    variant: 'confirmed-waitlist',
    waitlistPosition: 2,
    signedIn: true,
    openSlots: 3,
    onJoinFromWaitlist: fn(),
  },
}
export const SignedInWaitlistedOpenSlotsLight: Story = {
  ...SignedInWaitlistedOpenSlots,
  globals: { theme: 'light' },
}
/** The waitlisted player asked for a slot; the Queue Master confirms it. */
export const SignedInSlotRequested: Story = {
  args: {
    variant: 'confirmed-waitlist',
    waitlistPosition: 2,
    signedIn: true,
    openSlots: 3,
    slotRequestPending: true,
    onCancelRequest: fn(),
  },
}
export const SignedInWaitlisted: Story = {
  args: { variant: 'confirmed-waitlist', waitlistPosition: 2, signedIn: true },
}

/** Signed-in declined and requests off reuse the shared copy. */
export const SignedInDeclined: Story = { args: { variant: 'declined' } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }

/** A guest's status cards add "Register to check in and see your matches." (D-2026-11-09-03). */
export const SentGuestNudge: Story = {
  args: { variant: 'sent', name: guest.name, registerNudge: true },
}
export const ConfirmedSlotGuestNudge: Story = {
  args: { variant: 'confirmed-slot', registerNudge: true },
}
export const ConfirmedWaitlistGuestNudge: Story = {
  args: { variant: 'confirmed-waitlist', waitlistPosition: 2, registerNudge: true },
}
export const DeclinedGuestNudge: Story = { args: { variant: 'declined', registerNudge: true } }
export const DeclinedGuestNudgeLight: Story = {
  args: { variant: 'declined', registerNudge: true },
  globals: { theme: 'light' },
}
