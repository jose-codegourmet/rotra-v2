import type { ComponentMeta } from '@rotra/ui/meta'

export const inviteSignedInCardMeta = {
  name: 'InviteSignedInCard',
  description:
    'The card under the invite card for a signed-in player on P-JOIN-CLUB and P-JOIN-SESSION: "Signed in as <name>", the state\'s sentence or notice and its buttons.',
  usage: [
    'club: Join <club> and Not now. club-member: "You\'re already in <club>." and Go to my profile.',
    'session: the hand-over sentence ("Your request to join is ready to send on the session page. The Queue Master sees that <inviter> invited you."), Continue to request to join and Not now.',
    'own-invite, already-in and on-waitlist: the notice and Go to my profile.',
    'The app joins the club (useJoinClub) or opens the Queue session page; the card only draws the state.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-JOIN-CLUB (viewJoinClub), P-JOIN-SESSION (viewJoinSession)',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/mockup-changes/2026-11-16-player-google-sign-in.md',
  ],
  variants: [
    'ClubReady',
    'ClubJoining',
    'ClubError',
    'ClubAlreadyMember',
    'SessionReady',
    'SessionReadyNoInviter',
    'OwnInvite',
    'AlreadyIn',
    'OnWaitlist',
  ],
  related: ['InviteCard', 'JoinClubCard', 'Notice'],
} satisfies ComponentMeta
