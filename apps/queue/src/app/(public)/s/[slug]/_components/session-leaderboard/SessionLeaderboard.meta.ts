import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionLeaderboardMeta = {
  name: 'SessionLeaderboard',
  description:
    'Finished session page container for the Leaderboard tab: SessionStandings from the published standings, Your position › Share, and Share leaderboard.',
  usage: [
    'Rendered by PublicSession only when the club shared the Standings (the tab does not exist before).',
    'Your position › Share opens the system share sheet with “I finished #N of M at SESSION · CLUB (NW NL). Played on ROTRA.” and the session link; without one it copies them (“Copied to share” / “Couldn’t copy. Try again.”).',
    'Share leaderboard opens ShareDialog with LeaderboardShareCard; the viewer’s row is highlighted.',
  ],
  docs: [
    'docs/mockup-changes/2026-11-13-queue-finished-session-page.md',
    'docs/mockup-changes/2026-11-13-share-leaderboard.md',
  ],
  related: ['SessionStandings', 'LeaderboardShareCard', 'PublicSession'],
} satisfies ComponentMeta
