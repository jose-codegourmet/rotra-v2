import type { ComponentMeta } from '@rotra/ui/meta'
export const memberProfileMeta = {
  name: 'MemberProfile',
  description:
    'Maps a club member to ProfileCard (ClubMemberProfileSheet): profile, rank (#N overall) and the counted games this calendar year for a named member; the private card with their own banner for a masked one.',
  usage: [
    'Shared by P-CLUB-PAGE and P-CLUB-MEMBERS. Only named (unmasked) members are requested.',
    'Open ROTRA profile goes to /players/[playerId] in the same tab; Share profile opens the share dialog.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'SHEETS.profileCard' },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
} satisfies ComponentMeta
