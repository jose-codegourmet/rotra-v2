import type { ComponentMeta } from '@rotra/ui/meta'
export const adminPlayerQuickViewMeta = {
  name: 'AdminPlayerQuickView',
  description:
    'Compact Admin side panel with identity, private contacts, profile socials, two session summaries, embedded edit and registration invite.',
  variants: ['registered', 'unclaimed', 'edit', 'invite', 'loading', 'error', 'empty'],
  usage: ['Use on Admin Players management screens.'],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'Players' },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
} satisfies ComponentMeta
