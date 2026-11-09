import type { ComponentMeta } from '@rotra/ui/meta'

export const joinRequestCardMeta = {
  name: 'JoinRequestCard',
  description:
    "Q-PUBLIC-JOIN › the public session page's Want to play? card: how many slots are open (or that confirmed guests join the waitlist) with Request to join, the off state when the club is not taking requests online, and the visitor's own request status afterwards.",
  usage: [
    'Show under the hero on prepared and live public sessions. variant="open" with the actual openSlots and capacity (shown as “1 slot left” or “N slots left”), "full" when every slot is taken, or "active" during play; all call onRequestToJoin, which opens JoinRequestForm.',
    'Pass skillMix with confirmed player counts to show the SkillDistributionBar; omit it or pass zero counts when there are no players. Pass disabled on "open", "full" or "active" while the visitor is offline: sending a request needs internet, so Request to join is disabled.',
    'variant="off" when the session\'s Accept join requests is turned off: the card says to contact the Queue Master.',
    'After this visitor sent a request, pass their status instead: "sent" (with the name they typed), "confirmed-slot", "confirmed-waitlist" (with waitlistPosition) or "declined".',
    'Signed-in ROTRA player not in the session: pass signedInName on "open", "full" or "active" for the one-tap "Request to join as NAME" (no form; onRequestToJoin sends). After sending, pass variant="sent" with name and onCancelRequest to show Cancel request; pass signedIn on "confirmed-waitlist". The sheet with its three choices is app code, not this component.',
    'Guest (not signed in): pass registerNudge on "sent", "confirmed-slot", "confirmed-waitlist" and "declined" to add "Register to check in and see your matches." under the status notice; a guest has no My night card (D-2026-11-09-03). Leave it off for a signed-in ROTRA Player.',
    "A request is never a booking: never show a held slot. The Queue Master's review of requests is JoinRequestsPanel.",
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public session (guest) › joinCard (.join-card)',
  },
  docs: [
    'docs/screens/product/modules/queue/public-session.md#q-public-join--guest-join-request',
    'docs/business_logic/product/queue/modules/players/README.md#join-requests-from-the-session-link',
  ],
  variants: [
    'open',
    'full',
    'active',
    'off',
    'sent',
    'confirmed-slot',
    'confirmed-waitlist',
    'declined',
  ],
  related: ['JoinRequestForm', 'JoinRequestsPanel', 'SkillDistributionBar', 'Notice', 'Card'],
} satisfies ComponentMeta
