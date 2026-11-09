import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionInviteSheetMeta = {
  name: 'SessionInviteSheet',
  description:
    'Q-PUBLIC-JOIN Invite container: the "Session invite" Sheet around SessionInviteCard, with the Player\'s code from useSessionInviteCode(slug, playerId, open).',
  usage: [
    'Opened by Invite on the My night card (confirmed or waitlisted Player, session Prepared, requests on). The code is made the first time the sheet opens and is the same afterwards; the link is <origin>/s/<slug>?invite=<code>.',
    'Post and Story, Scan to join vs Waitlist open (session full) and Share vs Download image come from SessionInviteCard. Toast "Share sheet opened" after a share; the card reports failures through toast.error. Footer: Close.',
    'A refusal (the session has started, no slot or waitlist place) shows its reason in an error Notice instead of the card.',
  ],
  docs: ['docs/screens/product/modules/queue/public-session.md'],
  related: ['SessionInviteCard', 'ShareCard', 'Sheet', 'MyNight'],
} satisfies ComponentMeta
