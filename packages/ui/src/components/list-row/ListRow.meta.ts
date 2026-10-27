import type { ComponentMeta } from '@rotra/ui/meta'

export const listRowMeta = {
  name: 'ListRow',
  description:
    'One row of a list: an optional picture or icon, a title with a muted subtitle, and trailing chips or actions.',
  usage: [
    "Stack rows in a parent with divide-y divide-border (the prototypes' .list), often inside a Card.",
    'Pass onClick to make the whole row a button; do not also put a button in trailing then.',
    'Long names wrap by default; pass truncate for one-line rows (the full title becomes a tooltip).',
    'For tables with several columns use DataTable.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Shared styles › .list, .li (.click, .main); rotra-admin.html › .who',
  },
  related: ['Card', 'Avatar', 'DataTable'],
} satisfies ComponentMeta
