import type { ComponentMeta } from '@rotra/ui/meta'
export const adminPlayerQuickViewMeta = {
  name: 'AdminPlayerQuickView',
  description:
    'Compact Admin side panel with identity, private contacts, profile socials, two session summaries, embedded Edit (AdminEditPlayerForm, submitted by the footer Save changes) and registration invite.',
  variants: [
    'registered',
    'unclaimed',
    'edit',
    'edit-unclaimed',
    'edit-loading',
    'edit-field-errors',
    'invite',
    'loading',
    'error',
    'empty',
  ],
  usage: ['Use on Admin Players management screens.'],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'Players' },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
} satisfies ComponentMeta
