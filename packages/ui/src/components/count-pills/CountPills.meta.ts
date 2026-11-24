import type { ComponentMeta } from '@rotra/ui/meta'

export const countPillsMeta = {
  name: 'CountPills',
  description:
    'A row of separate rounded filter pills, each with a label and a small round count badge, where exactly one is picked, such as All courts · 15 / Court 1 · 5.',
  usage: [
    'Use for a filter whose options each carry a count that matters, such as Match History courts.',
    'The picked pill is solid accent with a lighter badge; the others are outlined. A count of 0 still shows.',
    'The row wraps onto a second line on phones. For short either/or settings use SegmentedControl.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Session console › Match History › court filter (.cfilter)',
  },
  docs: ['docs/mockup-changes/2026-11-19-queue-history-filter-pills.md'],
  related: ['SegmentedControl'],
} satisfies ComponentMeta
