import type { ComponentMeta } from '@rotra/ui/meta'

export const upcomingQueueRowMeta = {
  name: 'UpcomingQueueRow',
  description:
    'The Session view\'s "Upcoming queued matches": header with "N waiting · N need attention", one grid row of the first queue cards (compact cards: no wait times, stacked pictures with level rings), then a More queues tile that opens the Queue tab.',
  usage: [
    'Use once on the Session view (Q-COURTS), under the courts. Pass the whole waiting queue; the row shows the first (columns − 1) cards.',
    'Columns follow the grid width: as many 300 px+ tiles as fit, with no upper limit, so wider pages show more queued matches before More queues; pass columns to fix them.',
    'The faces use the club-facing face names (D-2026-11-26-09) when each MatchCardPlayer carries nickname and clubNickname: the label, then the other names in smaller plain lines.',
    'Do not use for the full queue grid; that is QueueGrid in Queue › Match queue.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-COURTS › upcomingPane() (.qgrid, .qtile.qmore)',
  },
  docs: [
    'docs/mockup-changes/2026-11-26-queue-name-hierarchy.md',
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  related: ['MatchCard', 'CourtCard'],
} satisfies ComponentMeta
