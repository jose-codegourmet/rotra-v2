import type { ComponentMeta } from '@rotra/ui/meta'
export const adminPlayerStatsMeta = {
  name: 'AdminPlayerStats',
  description: 'Six pressable player count cards for level and account filters.',
  usage: ['Use on Admin Players management screens.'],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'Players' },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
} satisfies ComponentMeta
