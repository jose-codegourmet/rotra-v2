import type { ComponentMeta } from '@rotra/ui/meta'
export const gamePlayerProfileMeta = {
  name: 'GamePlayerProfile',
  description:
    'Wires a face on a game court to its profile card: ClubMemberProfileSheet for a ROTRA player, the private card when the profile is hidden from the viewer, the Not on ROTRA yet card for a guest.',
  usage: [
    'Used by the Games page, Recent games, the session matches dialog and the Sessions page. A player with no playerId is a guest; nothing is requested for them.',
    'Open full profile goes to /players/[playerId].',
    'Latest stats count this calendar year (countYearCountedWins, statsYear) and are left out when the player turned off Show my profile stats, unless the viewer is that player.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'gameRow faces › openProfileCard',
  },
  docs: ['docs/mockup-changes/2026-11-13-player-game-row-court.md'],
  related: ['GameRow', 'ClubMemberProfileSheet', 'PrivateProfileCard'],
} satisfies ComponentMeta
