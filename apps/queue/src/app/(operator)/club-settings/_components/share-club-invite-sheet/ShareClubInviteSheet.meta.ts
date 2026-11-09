import type { ComponentMeta } from '@rotra/ui/meta'

export const shareClubInviteSheetMeta = {
  name: 'ShareClubInviteSheet',
  description:
    'Share club invite sheet: ClubInviteCard (Post and Story) in a Sheet with a Close footer. Shared by Club settings › Club invite link and the Home club header.',
  usage: [
    'Pass the club and the open state; the link comes from clubInviteUrl(club.id, club.inviteCode).',
    'Toasts: Share sheet opened, QR image downloaded.',
  ],
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['ClubInviteCard', 'ClubInvitePanel', 'ClubHeader'],
} satisfies ComponentMeta
