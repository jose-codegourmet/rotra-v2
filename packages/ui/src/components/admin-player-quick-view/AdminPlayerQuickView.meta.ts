import type { ComponentMeta } from '@rotra/ui/meta'
export const adminPlayerQuickViewMeta = {
  name: 'AdminPlayerQuickView',
  description:
    'Compact Admin side panel. Quick view is the banner profile card edge to edge (ProfileBannerCard: the player’s banner, else the default; 72 px picture; display name with the new-tab icon, full name, Copy RTR ID; level and Registered/Unclaimed chips), then private contacts, profile socials, Stats · YEAR and two session summaries; footer Edit, Full history, Share profile, Full profile. Embedded Edit (AdminEditPlayerForm, submitted by the footer Save changes) and registration invite keep the title bar.',
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
  usage: [
    'Use on Admin Players management screens.',
    'Pass bannerKey / bannerImageUrl (resolved; unclaimed and no pick get the default), year and stats (the same games as History, counted this calendar year), rotraProfileHref (/find/<RTR> in a new tab) and onShare (the Share profile dialog, with Back to the quick view).',
  ],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'Players' },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
} satisfies ComponentMeta
