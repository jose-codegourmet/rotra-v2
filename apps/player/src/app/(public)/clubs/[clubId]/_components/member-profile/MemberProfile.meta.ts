import type { ComponentMeta } from '@rotra/ui/meta'
export const memberProfileMeta = {
  name: 'MemberProfile',
  description:
    'Wires a club member to ClubMemberProfileSheet: profile, rank (#N overall) and the last 90 days of counted games for a named member; the private card for a masked one.',
  usage: [
    'Shared by P-CLUB-PAGE and P-CLUB-MEMBERS. Only named (unmasked) members are requested.',
    'Open full profile goes to /players/[playerId].',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'SHEETS.profileCard' },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
} satisfies ComponentMeta
