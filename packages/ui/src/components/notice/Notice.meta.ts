import type { ComponentMeta } from '@rotra/ui/meta'

export const noticeMeta = {
  name: 'Notice',
  description:
    'An inline banner with an icon and a short message: information, success, a warning, an error, or "working offline".',
  usage: [
    'Use title for the bold first sentence and children for the rest, as the prototypes write them.',
    'tone="offline" for the "Working offline on this device…" banner; online-only actions also need their own disabled explanation.',
    'Pass action for the one button that resolves it. For a failed load with Retry use ErrorState.',
    'Notices are announced without moving focus; do not focus them.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Shared styles › .notice (.ok, .warn, .bad); live console offline banner',
  },
  docs: [
    'docs/screens/product/experience-contract.md#standard-states',
    'docs/screens/product/state-matrix.md',
  ],
  variants: ['info', 'success', 'warn', 'error', 'offline'],
  related: ['ErrorState', 'EmptyState', 'SyncStatus'],
} satisfies ComponentMeta
