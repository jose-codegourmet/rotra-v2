import type { ComponentMeta } from '@rotra/ui/meta'

export const profileSessionsCardMeta = {
  name: 'ProfileSessionsCard',
  description:
    'Recent sessions on the profile: the three latest sessions the player played in, newest first, each a row (date block, title, “date · club”, the counted record “2W · 2L”, “N matches”, chevron) that opens the session matches dialog; All sessions (N) opens the Sessions page. Also exports SessionRecordRow, SessionRecordList (the Sessions page), SessionRecordText, sessionRecord and playedSessions.',
  usage: [
    'Pass the profile’s game history (usePlayerGames); sessions without games are left out.',
    'onOpenSession opens SessionMatchesSheet for that session; onOpenAll routes to /players/<id>/sessions.',
    'Empty: “No sessions joined yet.” and no All sessions button.',
    'The record counts counted games only; “N matches” counts every match, fun games included.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'latestSessionsCard(), sessRow(), viewSessions() (.crow.mbtn.ls-row, .dblk, .ls-rec)',
  },
  docs: [
    'docs/mockup-changes/2026-11-13-player-recent-sessions-games.md',
    'docs/mockup-changes/2026-11-13-player-latest-sessions.md',
  ],
  variants: ['three or more', 'fewer than three', 'none'],
  related: ['SessionMatchesSheet', 'RecentGamesCard', 'DateBlock'],
} satisfies ComponentMeta
