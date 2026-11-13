import type { ComponentMeta } from '@rotra/ui/meta'
export const publicMatchHistoryMeta = {
  name: 'PublicMatchHistory',
  description:
    'Match history on a finished session’s page: the count big and green, Yours · N and All · N, the replay on All once the results are shared, and one court per match.',
  usage: [
    'Replaces the read-only Queue on the Details tab of a finished session.',
    'Pass the open tab’s matches as they show now: on All the container keeps only those started by the replay’s time and sets `now` on the ones on court.',
    'Before the club shares the results, All shows the not-shared line and Yours lists only the viewer’s matches.',
    'Visitors (`signedIn` false) see the Log in line only.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public session page › Details › Match history (pubHistory)',
  },
  docs: [
    'docs/mockup-changes/2026-11-13-queue-finished-session-page.md',
    'docs/mockup-changes/2026-11-13-queue-match-history-courts.md',
    'docs/screens/product/modules/queue/public-session.md',
  ],
  related: ['MatchCourt', 'ReplayCard', 'PublicSessionQueue'],
} satisfies ComponentMeta
