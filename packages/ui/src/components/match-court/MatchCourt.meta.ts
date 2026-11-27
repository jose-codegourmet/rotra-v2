import type { ComponentMeta } from '@rotra/ui/meta'
export const matchCourtMeta = {
  name: 'MatchCourt',
  description:
    'One finished match drawn as a small badminton court: “#N · time” pill, faces with first names, the winning side ringed, and the score and result on the net.',
  usage: [
    'winChance.onOpen makes the win chance and Upset pills buttons (above the onOpen overlay); the Player variant shows the pills after its corner label too.',
    'Match page (2026-11-25): `onOpen` makes the whole court box a button under the faces (“Open the match page: <ariaLabel>”); faces and `action` keep their own actions. `skillRings` draws each face’s `skillGroup` as its picture border (Beginner, Intermediate, Advanced, none), and the winning side adds a dark gap and an accent outer ring.',
    'Use size: match-page on the main Game page court. At 900 px the faces are larger and both teams spread down their halves.',
    'Finished session page › Match history (Yours and All). The viewer’s own match: put their pair on the left with `mine` and their name labelled “You”.',
    'Other players’ matches: Team A on the left; the net box says “◀ Won” or “Won ▶”.',
    '`now` glows the court while the replay shows it on court; `invalid` desaturates it with an Invalid chip.',
    'Player variant: pass `cornerLabel` (the format, “Doubles”) instead of number/timeLabel; `action` is the top-right slot (the Share button), `notCounted` shows a “Not counted” chip with no winner rings, `note` and `dateLine` sit under the court (`plainNote` drops the note’s “· not counted” ending, for a game of a not ranked session); a face’s `badge` is its games badge (game N of that session). GameRow wraps this.',
    'Best of 3 (Q22): `score` holds the games won (“2–1”) and `gameScores` every game read from the left side; each shows in a small pill on its own line under the corner pill. The caller flips both when the viewer played on Team B. Omit `gameScores` for a one-game score.',
    'Queue session games dialog (D-SESSION-GAMES): `highlightedPlayerKey` (a face’s `key`) outlines that player’s picture in warn and turns their name pill warn; `versus` draws a planned match with “VS” on the net and no winner ring.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Public session page › Match history (pubHistoryMatch, .gm*); Player variant: apps/mockup/player-app/rotra-player.html gameRow',
  },
  docs: [
    'docs/mockup-changes/2026-11-25-player-match-page.md',
    'docs/mockup-changes/2026-11-13-queue-match-history-courts.md',
    'docs/mockup-changes/2026-11-13-queue-finished-session-page.md',
    'docs/mockup-changes/2026-11-13-player-game-row-court.md',
    'docs/mockup-changes/2026-11-14-player-game-row-games-badge.md',
    'docs/mockup-changes/2026-11-23-queue-games-badge-session-matches.md',
  ],
  related: ['GameRow', 'PublicMatchHistory', 'ReplayCard'],
} satisfies ComponentMeta
