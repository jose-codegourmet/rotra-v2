import type { ComponentMeta } from '@rotra/ui/meta'

export const syncStatusMeta = {
  name: 'SyncStatus',
  description:
    "The top-bar pill on every Queue operator screen that says whether this device's changes are saved and synced, using the exact sync labels.",
  usage: [
    'States and their words are fixed: Saving on this device, Saved on this device · waiting to sync, Syncing, Synced (with the last sync time), Needs attention, Changes could not be saved, Offline · N.',
    'onOpen opens a Sheet titled "Sync status" with SyncDetails inside.',
    'A connection dot alone never proves sync; the label always says the state.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Top bar › .conn (.off, .sync); Sync status sheet',
  },
  docs: [
    'docs/screens/product/experience-contract.md#save-and-sync-language',
    'docs/product-terms.md#8-offline-and-sync',
  ],
  variants: [
    'saving',
    'saved-waiting',
    'syncing',
    'synced',
    'needs-attention',
    'failed',
    'offline',
  ],
  related: ['SyncDetails', 'TopBar', 'Notice'],
} satisfies ComponentMeta
