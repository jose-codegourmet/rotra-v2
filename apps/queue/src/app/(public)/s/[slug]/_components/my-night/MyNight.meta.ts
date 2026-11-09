import type { ComponentMeta } from '@rotra/ui/meta'

export const myNightMeta = {
  name: 'MyNight',
  description:
    'Q-PUBLIC-JOIN My night container: wires useMyNight to MyNightCard and the signed-in Player\'s own writes (I\'m here, I\'m leaving, I can\'t make it, Cancel on a match request).',
  usage: [
    'Rendered by PublicSession above the Details and Participants tabs, under the join area, for a confirmed or waitlisted signed-in Player (mock mode). Guests get no card; the stage is null for a cancelled or invalid session, so nothing shows.',
    'Toasts are each write\'s own message: "Checked in" (or "Checked in · the QM will see it when their device syncs" while the club device is offline), "Told the QM you\'re leaving", "Told the QM you can\'t make it", "Match request cancelled". A refusal toasts its reason.',
    'Match history (finished) links to the Player app /players/<playerId>/games (P-MATCH-HISTORY) on the Player origin.',
    'Invite opens SessionInviteSheet. Request a match is not wired here; Q17.14 fills onRequestMatch.',
  ],
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/business_logic/product/queue/modules/players/README.md',
  ],
  related: ['MyNightCard', 'PublicSession', 'SessionInviteSheet'],
} satisfies ComponentMeta
