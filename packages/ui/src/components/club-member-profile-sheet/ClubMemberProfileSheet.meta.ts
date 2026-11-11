import type { ComponentMeta } from '@rotra/ui/meta'

export const clubMemberProfileSheetMeta = {
  name: 'ClubMemberProfileSheet',
  description:
    'The profile dialog a club member opens on the public club page and its Members page: a banner card (banner, round picture, name and nickname, level, #N overall, You), About (Registered in, RTR ID) and Stats · last 90 days, or the private card for a masked member.',
  usage: [
    'Open from ClubMemberGrid or ClubMemberList; a member tap opens this dialog and never leaves the page.',
    'Pass kind "private" for a masked member: picture and banner, the masked name, the Private profile chip and the explanation; no Open full profile.',
    'onViewPhoto (public members with a picture) makes the big picture the Avatar view button (“View full photo of NAME”, zoom-in cursor, focus ring) that opens PhotoViewer (#716); initials never open anything.',
    'The banner header is self-contained here for now; the Queue participant profile builds the same card in parallel and the two are unified later.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'SHEETS.profileCard (.pp-card, .pp-banner, .pp-sec, .pp-stats)',
  },
  docs: [
    'docs/screens/product/modules/player-information/profile.md',
    'docs/screens/product/modules/player-information/club-page.md',
  ],
  variants: ['public', 'private', 'no-games', 'loading'],
  related: ['ClubMemberGrid', 'ClubMemberList', 'PlayerProfileSheet', 'PhotoViewer'],
} satisfies ComponentMeta
