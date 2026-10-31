import type { ComponentMeta } from '@rotra/ui/meta'
export const unrecoverableSessionPanelMeta = {
  name: 'UnrecoverableSessionPanel',
  description:
    'Incomplete original records and recovery guidance. New recovery sentences need product-owner copy review.',
  usage: ['Use for missing or inconsistent records, never merely a low game count.'],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'No recovery screen; shared sheet and notice patterns',
  },
  docs: ['docs/screens/product/modules/queue/offline-recovery.md'],
  variants: ['default'],
} satisfies ComponentMeta
