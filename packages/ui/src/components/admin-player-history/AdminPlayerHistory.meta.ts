import type { ComponentMeta } from '@rotra/ui/meta'
export const adminPlayerHistoryMeta = {
  name: 'AdminPlayerHistory',
  description:
    'Read-only player game history, with a compact latest-session summary for the Admin Quick view.',
  variants: ['default', 'compact', 'loading', 'empty', 'error'],
  usage: ['Use on Admin Players management screens.'],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'Players' },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
} satisfies ComponentMeta
