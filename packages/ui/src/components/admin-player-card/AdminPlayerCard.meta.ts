import type { ComponentMeta } from '@rotra/ui/meta'
export const adminPlayerCardMeta = {
  name: 'AdminPlayerCard',
  description: 'Player list row or compact grid card with selection and actions.',
  usage: [
    'Use on Admin Players management screens.',
    'Selection stays in the header and does not open quick view.',
  ],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'Players' },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
} satisfies ComponentMeta
