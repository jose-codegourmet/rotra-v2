import type { ComponentMeta } from '@rotra/ui/meta'
export const conflictReviewListMeta = {
  name: 'ConflictReviewList',
  description:
    'Read-only original-device evidence. Conflict resolution is an unresolved decision gate; new notice copy needs owner review.',
  usage: ['Never offer an outcome editor, override, or device enrollment flow.'],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'No recovery screen; console notice placement and MatchRecordCard patterns',
  },
  docs: ['docs/screens/product/modules/queue/offline-recovery.md'],
  variants: ['two-conflicts', 'one-conflict-long-names'],
} satisfies ComponentMeta
