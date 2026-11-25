import type { ComponentMeta } from '@rotra/ui/meta'
export const adminPlayerBulkBarMeta = {
  name: 'AdminPlayerBulkBar',
  description: 'Fixed dock for actions on selected players.',
  usage: [
    'Use on Admin Players management screens.',
    'canRemove (default true): false hides Remove; the Admin app passes false in real mode, where permanent removal is not connected to saved data yet.',
  ],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'Players' },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
} satisfies ComponentMeta
