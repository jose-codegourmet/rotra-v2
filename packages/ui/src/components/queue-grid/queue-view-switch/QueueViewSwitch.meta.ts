import type { ComponentMeta } from '@rotra/ui/meta'

export const queueViewSwitchMeta = {
  name: 'QueueViewSwitch',
  description:
    "The Main Queue's view switch: two icon segments, Slide mode and Grid mode, with tooltips and screen-reader names, on SegmentedControl.",
  usage: [
    'QueueGrid renders it in its own bar; use it alone only when a screen lays the queue out itself.',
    'useQueueViewMode keeps the choice per device in localStorage (try/catch, slide on the server and first paint).',
    'Do not use for filters or other two-way switches; SegmentedControl is the general component.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-QUEUE › queuePane() (.qview, qView)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/mockup-changes/2026-11-19-queue-main-queue-slide-mode.md',
  ],
  related: ['QueueGrid', 'SegmentedControl'],
} satisfies ComponentMeta
