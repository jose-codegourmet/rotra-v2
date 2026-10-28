import type { ComponentMeta } from '@rotra/ui/meta'
export const syncStatusDialogMeta = {
  name: 'SyncStatusDialog',
  description:
    'The operator top-bar sync dialog, with device-local changes and session integrity notices.',
  usage: [
    'Mount once in the operator shell; never claim zero pending proves session completeness.',
  ],
  docs: ['docs/screens/product/modules/queue/offline-recovery.md'],
} satisfies ComponentMeta
