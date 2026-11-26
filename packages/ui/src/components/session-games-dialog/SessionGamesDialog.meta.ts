import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionGamesDialogMeta = {
  name: 'SessionGamesDialog',
  description:
    'D-SESSION-GAMES: a compact “NAME’s games” dialog opened from the games badge on a face. A one-line header (picture with the level ring, full name, level), the Matches and Planned queue pills with a count each, then the list; footer Close. Matches are the player’s finished matches latest first (time · court · length, a Counts / Not counted / Invalid · not counted chip, the history court with the player’s face outlined in warn); Planned queue is the waiting Main Queue matches nearest first, drawn with VS.',
  usage: [
    'Presentational: pass the player’s finished matches (any order, the dialog sorts latest first), the planned queue matches (nearest first) and `gamesPlayed`. Each match carries its own `counting` (counts, not-counted, invalid).',
    '`setByHand` adds “includes +N set by hand”; the “N waiting in the Main Queue” part follows `planned.length`. `onCourt` shows the notice “NAME is playing on Court 2 now (Match 18). It counts after Match done.” (“getting ready” for a Getting ready match; the sentence “It counts…” only on Matches).',
    'A face calls `onOpenProfile(playerId)`. “Back to games” is the caller’s job: close this dialog (`open` false), open the profile with a Back button, and on Back set `open` true again. Keep the picked pill with `tab` and `onTabChange` so Back returns to the same pill.',
    'Opened from the games badge (`onOpenGames` on CourtCard, MatchCard); a badge inside another dialog stays display only.',
    'Empty copy: “NAME has no finished matches yet this session.”; “NAME isn’t in the Main Queue right now.”',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'sessionGames sheet › sessionGamesBody(), plannedQueueBody(), historyMatch(s, m, hl)',
  },
  docs: [
    'docs/screens/product/dialogs.md',
    'docs/mockup-changes/2026-11-23-queue-games-badge-session-matches.md',
  ],
  variants: ['matches', 'planned queue', 'playing now', 'getting ready', 'empty'],
  related: ['Sheet', 'CountPills', 'MatchCourt', 'LiveMatchHistory', 'CourtCard', 'MatchCard'],
} satisfies ComponentMeta
