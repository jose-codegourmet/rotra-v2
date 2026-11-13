import type { ComponentMeta } from '@rotra/ui/meta'

export const myNightMeta = {
  name: 'MyNight',
  description:
    "Q-PUBLIC-JOIN My night container: wires useMyNight to MyNightCard and the signed-in Player's own writes (I'm here, I'm leaving, I can't make it, Cancel on a match request).",
  usage: [
    'Rendered by PublicSession above the Details and Participants tabs, under the join area, for a confirmed or waitlisted signed-in Player (mock mode). Guests get no card; the stage is null for a cancelled or invalid session, so nothing shows.',
    'Toasts are each write\'s own message: "Checked in" (or "Checked in · the QM will see it when their device syncs" while the club device is offline), "Told the QM you\'re leaving", "Told the QM you can\'t make it", "Match request cancelled". A refusal toasts its reason.',
    'No Match history link once finished (2026-11-13-queue-finished-session-page): the match history is on the page itself.',
    'Invite opens SessionInviteSheet; Request a match opens the Request a match sheet.',
    'Once the session is finished or cancelled (sessionOpen false) the open "I can\'t make it" notice and match request are hidden (kept in state), Invite is hidden and Request a match is unreachable. Invite is also hidden while the club has join requests off (acceptJoinRequests false).',
    'Offline (the visitor\'s DevMenu toggle): a present Player who checked in reads "Checked in · the QM will see it when their device syncs". The signed-in reads need internet, so offline the last read stays on screen.',
  ],
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/business_logic/product/queue/modules/players/README.md',
  ],
  related: ['MyNightCard', 'PublicSession', 'SessionInviteSheet'],
} satisfies ComponentMeta
