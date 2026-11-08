import type { ComponentMeta } from '@rotra/ui/meta'
export const playerPaginationMeta = {
  name: 'PlayerPagination',
  description: 'Player pagination with an optional directory bar and rows picker.',
  usage: ['Use on Admin Players management screens.'],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'Players' },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
} satisfies ComponentMeta
