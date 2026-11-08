import type { ComponentMeta } from '@rotra/ui/meta'
export const adminEditPlayerFormMeta = {
  name: 'AdminEditPlayerForm',
  description:
    'Shared Admin player edit and before/after review, rendered in its own sheet or embedded in Quick view.',
  variants: ['sheet', 'embedded'],
  usage: ['Use on Admin Players management screens.'],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'Players' },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
} satisfies ComponentMeta
