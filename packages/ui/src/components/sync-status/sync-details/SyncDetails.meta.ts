import type { ComponentMeta } from '@rotra/ui/meta'

export const syncDetailsMeta = {
  name: 'SyncDetails',
  description:
    'The body of the Sync status sheet: the current sync state, what is waiting on this device, and what has synced, grouped by area.',
  usage: [
    'Put it inside a Sheet titled "Sync status" with a Close button, opened from SyncStatus.',
    'Group changes by the area they touched (Roster, Queue, Matches and results, Courts and time, Payments, …).',
    "Shows this device only; never imply another device's changes are included.",
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Sync status sheet (.sync-head, .sync-grp, .sync-list)',
  },
  docs: ['docs/screens/product/experience-contract.md#save-and-sync-language'],
  related: ['SyncStatus', 'Sheet'],
} satisfies ComponentMeta
