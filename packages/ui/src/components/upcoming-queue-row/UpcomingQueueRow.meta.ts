import type { ComponentMeta } from '@rotra/ui/meta'

export const upcomingQueueRowMeta = {
  name: 'UpcomingQueueRow',
  description:
    'The Session view\'s "Upcoming queued matches": header with "N waiting · N need attention", one grid row of the first queue cards, then a More queues tile that opens the Queue tab.',
  usage: [
    'Use once on the Session view (Q-COURTS), under the courts. Pass the whole waiting queue; the row shows the first (columns − 1) cards.',
    'Columns follow the grid width: as many 220 px+ tiles as fit, with no upper limit, so wider pages show more queued matches before More queues; pass columns to fix them.',
    'Do not use for the full queue grid; that is QueueGrid in Queue › Match queue.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-COURTS › upcomingPane() (.qgrid, .qtile.qmore)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  related: ['MatchCard', 'CourtCard'],
} satisfies ComponentMeta
