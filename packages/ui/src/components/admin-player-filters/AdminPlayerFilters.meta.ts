import type { ComponentMeta } from '@rotra/ui/meta'
export const adminPlayerFiltersMeta = {
  name: 'AdminPlayerFilters',
  description: 'Player search, account and layout controls with a collapsible filters panel.',
  usage: ['Use on Admin Players management screens.'],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'Players' },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
} satisfies ComponentMeta
