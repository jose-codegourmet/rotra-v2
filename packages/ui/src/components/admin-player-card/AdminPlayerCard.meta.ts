import type { ComponentMeta } from '@rotra/ui/meta'
export const adminPlayerCardMeta = {
  name: 'AdminPlayerCard',
  description: 'Player list row or compact grid card with selection and actions.',
  usage: [
    'Use on Admin Players management screens.',
    'detailsRequired adds the warn Details required chip next to Unclaimed (an older record with a phone and no email, D-2026-11-16-04).',
    'An unclaimed player whose clubs each carry savedAs shows "<First club> and 1 more club" ("and N more clubs") instead of createdBy, and the Not on leaderboard rank chip.',
    'Selection stays in the header and does not open quick view.',
  ],
  variants: ['registered', 'unclaimed', 'details-required', 'saved-by-more-than-one-club', 'grid'],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'Players' },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
} satisfies ComponentMeta
