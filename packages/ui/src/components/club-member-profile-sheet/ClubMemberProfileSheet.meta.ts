import type { ComponentMeta } from '@rotra/ui/meta'

export const clubMemberProfileSheetMeta = {
  name: 'ClubMemberProfileSheet',
  description:
    'The profile dialog in ROTRA Player (club page members, the leaderboard): a header-less ProfileBannerCard (banner strip, round picture, display name with a forward arrow, full name, Copy player ID, level, #N overall, You), About (Registered in) and Stats · YEAR; footer Close, Share profile, Open ROTRA profile (same tab). Masked members get the private card with their own banner.',
  usage: [
    'Open from ClubMemberGrid, ClubMemberList, the leaderboard rows and the podium; a tap opens this dialog and never leaves the page.',
    'Pass kind "private" for a masked member: picture and their own banner, the masked name, the Private profile chip and the explanation; Close only.',
    'Inside ROTRA Player the profile opens in the same tab: onOpenFullProfile (the name arrow and Open ROTRA profile) navigates in the app; profileHref is the arrow link. onShare opens the Share profile dialog for this player.',
    'onViewPhoto (public members with a picture) makes the big picture the Avatar view button (“View full photo of NAME”, zoom-in cursor, focus ring) that opens PhotoViewer (#716); initials never open anything.',
    'bannerKey and bannerImageUrl render the resolved profile banner; an uploaded image takes precedence.',
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
  related: ['ProfileBannerCard', 'ClubMemberGrid', 'ClubMemberList', 'PhotoViewer'],
} satisfies ComponentMeta
