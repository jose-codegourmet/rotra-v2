import type { ComponentMeta } from '@rotra/ui/meta'
export const conflictReviewListMeta = {
  name: 'ConflictReviewList',
  description:
    "Read-only original-device evidence, or (real mode, #722) a change this device saved offline that the server refused on replay, with Keep the server's version and Retry. Two-device conflict resolution stays an unresolved decision gate.",
  usage: [
    'Never offer an outcome editor, override, or device enrollment flow.',
    'A conflict with `pending` is an outbox command the server answered 409 to: onKeepServer drops it (the commands after it replay), onRetry sends it again. The container wires useResolveSyncConflict.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'No recovery screen; console notice placement and MatchRecordCard patterns',
  },
  docs: ['docs/screens/product/modules/queue/offline-recovery.md'],
  variants: ['two-conflicts', 'one-conflict-long-names', 'refused-device-change'],
} satisfies ComponentMeta
