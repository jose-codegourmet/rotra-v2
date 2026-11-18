import type { ComponentMeta } from '@rotra/ui/meta'
export const adminPlayerClubsMeta = {
  name: 'AdminPlayerClubs',
  description:
    'Admin Players management: the clubs that saved a player, as chips; or, for an unclaimed player saved by more than one club, each club with that club\'s own name for them.',
  usage: [
    'Use on Admin Players management screens.',
    'Pass savedBy (from savedByClubs(player) in AdminPlayerClubs.helpers) to list "<Club> · saved as <name>" and "Saved by more than one club. Not on the leaderboard until they register." (D-2026-11-16-04).',
  ],
  variants: ['chips', 'saved-by-more-than-one-club'],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'Players' },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
} satisfies ComponentMeta
