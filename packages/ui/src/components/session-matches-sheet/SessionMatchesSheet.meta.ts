import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionMatchesSheetMeta = {
  name: 'SessionMatchesSheet',
  description:
    'One session’s matches for one player, opened from a Recent sessions row or the Sessions page: the date block, date, club and counted record, then “Your matches · N” / “NAME’s matches · N” and every match (fun games marked “Fun game · not counted”). Footer Close, Share performance (own) and Session page.',
  usage: [
    'session null keeps it closed; the container keeps the chosen session id.',
    'whose is “Your” on your own profile, else the display name (nickname first) with “’s”.',
    'Session page opens the Queue session page in a new tab; hidden when sessionPageUrl is null (no longer available).',
    'onShareGame and onSharePerformance only on your own profile.',
    'A session with `ranked: false` (Record games off) shows a Not ranked chip after the club; its games count in the record and each carries the not ranked note.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'SHEETS.sessionGames (SHEETS_SESSION; .ls-head, .ls-rec.big)',
  },
  docs: [
    'docs/mockup-changes/2026-11-13-player-latest-sessions.md',
    'docs/mockup-changes/2026-11-13-player-recent-sessions-games.md',
    'docs/mockup-changes/2026-11-20-player-not-ranked-games.md',
  ],
  variants: ['own', 'someone else', 'with fun games', 'session page gone', 'not ranked session'],
  related: ['ProfileSessionsCard', 'GameRow', 'NotRankedChip', 'Sheet'],
} satisfies ComponentMeta
