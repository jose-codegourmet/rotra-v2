import type { ComponentMeta } from '@rotra/ui/meta'
export const matchCourtMeta = {
  name: 'MatchCourt',
  description:
    'One finished match drawn as a small badminton court: “#N · time” pill, faces with first names, the winning side ringed, and the score and result on the net.',
  usage: [
    'Finished session page › Match history (Yours and All). The viewer’s own match: put their pair on the left with `mine` and their name labelled “You”.',
    'Other players’ matches: Team A on the left; the net box says “◀ Won” or “Won ▶”.',
    '`now` glows the court while the replay shows it on court; `invalid` desaturates it with an Invalid chip.',
    'Player profile games use GameRow, the same court design for one player’s own games.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public session page › Match history (pubHistoryMatch, .gm*)',
  },
  docs: [
    'docs/mockup-changes/2026-11-13-queue-match-history-courts.md',
    'docs/mockup-changes/2026-11-13-queue-finished-session-page.md',
  ],
  related: ['GameRow', 'PublicMatchHistory', 'ReplayCard'],
} satisfies ComponentMeta
