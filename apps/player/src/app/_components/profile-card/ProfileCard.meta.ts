import type { ComponentMeta } from '@rotra/ui/meta'
export const profileCardMeta = {
  name: 'ProfileCard',
  description:
    'Wires a player to ClubMemberProfileSheet in ROTRA Player: profile (banner, RTR ID), rank (#N overall) and the counted games this calendar year for a named player; Share profile through usePlayerShareSheet; the private card with their own banner for a masked one.',
  usage: [
    'Shared by the club page members (MemberProfile) and the leaderboard rows and podium (LeaderboardPage).',
    'Open ROTRA profile and the name arrow close the card and go to /players/[playerId] in the same tab.',
    'Only named (unmasked) players are requested.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'SHEETS.profileCard' },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
} satisfies ComponentMeta
