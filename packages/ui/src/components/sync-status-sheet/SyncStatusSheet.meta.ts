import type { ComponentMeta } from '@rotra/ui/meta'
export const syncStatusSheetMeta = {
  name: 'SyncStatusSheet',
  description:
    'Device-local sync status and bounded recovery notices. New recovery sentences need product-owner copy review.',
  usage: [
    'Use for Q-SYNC; zero pending changes on this device does not prove session completeness.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Sync status sheet and shared notice patterns',
  },
  docs: ['docs/screens/product/modules/queue/offline-recovery.md'],
  variants: ['online', 'syncing', 'offline'],
} satisfies ComponentMeta
