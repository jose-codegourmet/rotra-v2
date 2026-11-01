import type { ComponentMeta } from '@rotra/ui/meta'
export const playerDirectoryMeta = {
  name: 'PlayerDirectory',
  description:
    'Admin player management with filtered statistics, URL filters, numbered pages, cards or list, quick view, and bulk actions.',
  usage: [
    'URL parameters preserve search, account, level, duplicate groups, creation date, place, archive state, page size, view and quick-view player. Legacy shown links remain accepted.',
    'List is the desktop default; browser preference persists and an explicit URL view wins. Phones use cards. Selection survives paging and view changes and clears when filters change.',
    'Only privileged Admin search matches phone or email. Duplicate notices disclose match reasons, never contact values. Duplicate groups stay on the same page.',
    'Unclaimed profiles may be created explicitly. Records without a creator club display Created by Admin. Mutations are in-memory mocks and disabled offline.',
    'Rows and cards open quick view. Profile and history links preserve directory context. Loading, empty, error and permission states use shared components.',
  ],
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
  related: [
    'AdminPlayerStats',
    'AdminPlayerFilters',
    'AdminPlayerCard',
    'AdminPlayerQuickView',
    'AdminPlayerBulkBar',
    'PlayerPagination',
  ],
} satisfies ComponentMeta
