import type { ComponentMeta } from '@rotra/ui/meta'

export const queueViewSwitchMeta = {
  name: 'QueueViewSwitch',
  description:
    "The view switch: two icon segments, Slide mode and Grid mode, with tooltips and screen-reader names, on SegmentedControl. The Main Queue's, and the Courts header's Court layout.",
  usage: [
    'QueueGrid renders it in its own bar; use it alone only when a screen lays the queue out itself.',
    'useQueueViewMode keeps the choice per device in localStorage (try/catch, slide on the server and first paint).',
    'Courts header (Q-COURTS): label "Court layout", gridFirst (Grid mode, then Slide mode) and slideIcon "list", on the right of the Auto Queue row.',
    'Do not use for filters or other two-way switches; SegmentedControl is the general component.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Q-QUEUE › queuePane() (.qview, qView); Q-COURTS › courtsPane() (.qview "Court layout", setCourtView)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/mockup-changes/2026-11-19-queue-main-queue-slide-mode.md',
    'docs/mockup-changes/2026-11-26-queue-court-match-line.md',
  ],
  related: ['QueueGrid', 'SegmentedControl'],
} satisfies ComponentMeta
