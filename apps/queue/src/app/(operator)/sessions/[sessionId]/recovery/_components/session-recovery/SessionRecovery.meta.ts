import type { ComponentMeta } from '@rotra/ui/meta'
export const sessionRecoveryMeta = {
  name: 'SessionRecovery',
  description:
    'The incomplete-records recovery flow with a separate explicit invalidation confirmation.',
  usage: ['Recovery only; never reopen invalid sessions or reconstruct original scores.'],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'No recovery screen; sheet and notice patterns',
  },
  docs: [
    'docs/screens/product/modules/queue/offline-recovery.md',
    'docs/screens/product/dialogs.md',
  ],
} satisfies ComponentMeta
