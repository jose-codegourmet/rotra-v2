import type { ComponentMeta } from '@rotra/ui/meta'

export const chipMeta = {
  name: 'Chip',
  description:
    'A small rounded state label: identity (Registered, Unclaimed), session state (Live, Preparing), warnings and counts.',
  usage: [
    'Always has text; colour only reinforces it.',
    'accent for good or done states, warn for needs attention or pending, error for failed or invalid, solid for neutral emphasis, live for a running session (its dot stops under reduced motion).',
    'For a big top-bar sync state use SyncStatus, not a Chip.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Shared styles › .chip (.ok, .warn, .bad, .solid); rotra-admin.html › .live',
  },
  docs: ['docs/screens/product/experience-contract.md'],
  variants: ['neutral', 'accent', 'warn', 'error', 'solid', 'live'],
  related: ['SyncStatus', 'Tabs'],
} satisfies ComponentMeta
