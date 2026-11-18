import type { ComponentMeta } from '@rotra/ui/meta'
export const adminPlayerFiltersMeta = {
  name: 'AdminPlayerFilters',
  description: 'Player search, account and layout controls with a collapsible filters panel.',
  usage: [
    'Use on Admin Players management screens.',
    'The account switch is All, Registered, Unclaimed and Details required (account "details", D-2026-11-16-04); an empty result is the screen empty state.',
  ],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'Players' },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
} satisfies ComponentMeta
