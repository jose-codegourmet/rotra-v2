import type { ComponentMeta } from '@rotra/ui/meta'
export const matchCourtMeta = {
  name: 'MatchCourt',
  description:
    'One finished match drawn as a small badminton court: “#N · time” pill, faces with first names, the winning side ringed, and the score and result on the net.',
  usage: [
    'Finished session page › Match history (Yours and All). The viewer’s own match: put their pair on the left with `mine` and their name labelled “You”.',
    'Other players’ matches: Team A on the left; the net box says “◀ Won” or “Won ▶”.',
    '`now` glows the court while the replay shows it on court; `invalid` desaturates it with an Invalid chip.',
    'Player variant: pass `cornerLabel` (the format, “Doubles”) instead of number/timeLabel; `action` is the top-right slot (the Share button), `notCounted` shows a “Not counted” chip with no winner rings, `note` and `dateLine` sit under the court. GameRow wraps this.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Public session page › Match history (pubHistoryMatch, .gm*); Player variant: apps/mockup/player-app/rotra-player.html gameRow',
  },
  docs: [
    'docs/mockup-changes/2026-11-13-queue-match-history-courts.md',
    'docs/mockup-changes/2026-11-13-queue-finished-session-page.md',
    'docs/mockup-changes/2026-11-13-player-game-row-court.md',
  ],
  related: ['GameRow', 'PublicMatchHistory', 'ReplayCard'],
} satisfies ComponentMeta
