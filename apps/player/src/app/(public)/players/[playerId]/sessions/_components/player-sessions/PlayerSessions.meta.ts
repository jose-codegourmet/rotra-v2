import type { ComponentMeta } from '@rotra/ui/meta'
export const playerSessionsMeta = {
  name: 'PlayerSessions',
  description:
    'P-SESSIONS: every club session a player played in, newest first (SessionRecordList), each row opening SessionMatchesSheet; back to the profile.',
  usage: [
    'Reached from All sessions (N) on the profile’s Recent sessions card.',
    'Reads the profile and its game history (usePlayerProfile, usePlayerGames); a private profile shows the private gate, a sign-in-only profile the sign-in card.',
    'Own sessions: Share performance in the dialog and the share icon on each counted court.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'viewSessions(), sessRow()',
  },
  docs: [
    'docs/screens/product/modules/player-information/ranking-history.md',
    'docs/mockup-changes/2026-11-13-player-recent-sessions-games.md',
  ],
  variants: ['own', 'public', 'empty', 'private', 'loading', 'error', 'not-found'],
  related: ['ProfileSessionsCard', 'SessionMatchesSheet', 'GameHistory'],
} satisfies ComponentMeta
