import type { ComponentMeta } from '@rotra/ui/meta'

export const dataTableMeta = {
  name: 'DataTable',
  description:
    'A sortable table for directories and lists (clubs, players, license terms) that turns into one labelled card per row on phones.',
  usage: [
    "Define columns next to the container (_components/<name>/<Name>.columns.tsx) with TanStack's createColumnHelper.",
    'Mark the main cell with meta.lead (unlabelled card heading on phones), numbers with meta.align="right", dates with meta.nowrap.',
    'Pass toolbar for search and SegmentedControl filters, empty for an EmptyState, error for an ErrorState, loading for skeleton rows.',
    'onRowClick makes rows clickable and keyboard reachable (Enter, Space); keep a real link or button inside the lead cell too.',
    'At 760 px and below there is no sideways scroll. Server pagination is out of scope.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'Clubs and licenses › .tbl.cards, .tbl-wrap, .toolbar; rotra-queue.html › .stack-table',
  },
  docs: [
    'docs/coding-conventions.md#12-tables',
    'docs/screens/product/experience-contract.md#layout-and-device-behavior',
  ],
  related: ['EmptyState', 'ErrorState', 'Skeleton', 'SegmentedControl', 'ListRow'],
} satisfies ComponentMeta
