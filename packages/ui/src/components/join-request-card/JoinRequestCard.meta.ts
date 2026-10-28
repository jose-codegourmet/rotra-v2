import type { ComponentMeta } from '@rotra/ui/meta'

export const joinRequestCardMeta = {
  name: 'JoinRequestCard',
  description:
    "Q-PUBLIC-JOIN › the public session page's Want to play? card: how many slots are open (or that confirmed guests join the waitlist) with Request to join, the off state when the club is not taking requests online, and the visitor's own request status afterwards.",
  usage: [
    'Show under the hero on prepared and live public sessions. variant="open" with openSlots and capacity, or "full" when every slot is taken; both call onRequestToJoin, which opens JoinRequestForm.',
    'Pass disabled on "open" or "full" while the visitor is offline: sending a request needs internet, so Request to join is disabled.',
    'variant="off" when the session\'s Accept join requests is turned off: the card says to contact the Queue Master.',
    'After this visitor sent a request, pass their status instead: "sent" (with the name they typed), "confirmed-slot", "confirmed-waitlist" (with waitlistPosition) or "declined".',
    "A request is never a booking: never show a held slot. The Queue Master's review of requests is JoinRequestsPanel.",
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Public session (guest) › joinCard (.join-card)',
  },
  docs: [
    'docs/screens/product/modules/queue/public-session.md#q-public-join--guest-join-request',
    'docs/business_logic/product/queue/modules/players/README.md#join-requests-from-the-session-link',
  ],
  variants: ['open', 'full', 'off', 'sent', 'confirmed-slot', 'confirmed-waitlist', 'declined'],
  related: ['JoinRequestForm', 'JoinRequestsPanel', 'Notice', 'Card'],
} satisfies ComponentMeta
