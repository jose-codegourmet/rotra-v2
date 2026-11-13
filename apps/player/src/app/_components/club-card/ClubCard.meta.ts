import type { ComponentMeta } from '@rotra/ui/meta'
export const clubCardMeta = {
  name: 'ClubCard',
  description:
    'Wires a club to ClubProfileCard in ROTRA Player (D-CLUB-PROFILE): useClubPage for the name, city, members and sessions; the default banner; Open club page goes to /clubs/[clubId] in the same tab.',
  usage: ['Opened from a row of the profile’s Clubs card (PlayerClubsCard onOpenClub).'],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'SHEETS.clubCard' },
  docs: [
    'docs/screens/product/dialogs.md',
    'docs/screens/product/modules/player-information/profile.md',
  ],
} satisfies ComponentMeta
