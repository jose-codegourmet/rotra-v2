import type { ComponentMeta } from '@rotra/ui/meta'

export const inviteCardMeta = {
  name: 'InviteCard',
  description:
    'The invite landing card at the top of P-INVITE, P-JOIN-CLUB and P-JOIN-SESSION, in three variants: a club invite, a session invite (with or without an inviter) and the ROTRA Admin registration link. It is not the Queue club share card (ClubInviteCard), which is a QR image.',
  usage: [
    'variant "club": "Club invite", "Join <club>", the city and "<n> members" chips and the saved-players sentence.',
    'variant "session": "Session invite", "<inviter> invites you to play" or "You\'re invited to play" without an inviter, the date block, title, club, when, the chips "Join requests open" and "Invited by <name>", and the Queue Master line.',
    'variant "admin": "ROTRA registration", "Create your ROTRA account".',
    'Pass already-formatted text (when) and data; the card never fetches. The buttons under it belong to the screen.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-INVITE, P-JOIN-CLUB, P-JOIN-SESSION (inviteHero, .invite-card)',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/mockup-changes/2026-11-16-player-google-sign-in.md',
  ],
  variants: ['club', 'session', 'session-without-inviter', 'admin'],
  related: ['ClubInviteCard', 'JoinClubCard', 'Avatar', 'DateBlock', 'Chip'],
} satisfies ComponentMeta
