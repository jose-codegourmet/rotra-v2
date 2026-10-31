import type { ComponentMeta } from '@rotra/ui/meta'

export const keyValueListMeta = {
  name: 'KeyValueList',
  description:
    "Label and value pairs in two columns, such as a session's venue, time and courts, or a club's license details.",
  usage: [
    'Use for read-only details. Long values (RTR IDs, addresses) wrap instead of overflowing.',
    'On phones ≤ 420 px each label stacks above its value.',
    'For editable values use Field-based forms.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'Shared styles › .kv (club detail, license); rotra-queue.html › .kv',
  },
  related: ['Card'],
} satisfies ComponentMeta
