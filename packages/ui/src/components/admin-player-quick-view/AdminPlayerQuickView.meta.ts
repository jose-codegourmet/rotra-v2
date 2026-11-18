import type { ComponentMeta } from '@rotra/ui/meta'
export const adminPlayerQuickViewMeta = {
  name: 'AdminPlayerQuickView',
  description:
    'Compact Admin side panel. Quick view is the banner profile card edge to edge (ProfileBannerCard: the player’s banner, else the default; 72 px picture; display name with the new-tab icon, full name, Copy RTR ID; level and Registered/Unclaimed chips), then private contacts, profile socials, Latest stats and two session summaries; footer Edit, Full history, Share profile, Full profile. Embedded Edit (AdminEditPlayerForm, submitted by the footer Save changes) and registration invite keep the title bar.',
  variants: [
    'registered',
    'unclaimed',
    'details-required',
    'saved-by-more-than-one-club',
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
    'detailsRequired adds the warn Details required chip next to Unclaimed and the notice "Details required. This older record has a phone and no email. <Club> must add an email or delete the record." (D-2026-11-16-04).',
    'An unclaimed player whose clubs each carry savedAs gets a Created by row: "<Club> · saved as <name>" per club and "Saved by more than one club. Not on the leaderboard until they register."',
    "Edit mode shows the form's Registration place and date with the RTR ID preview; pass previewRtrId and the collision error through `edit`.",
    'Pass bannerKey / bannerImageUrl (resolved; unclaimed and no pick get the default), year and stats (the same games as History, counted this calendar year), rotraProfileHref (/find/<RTR> in a new tab) and onShare (the Share profile dialog, with Back to the quick view).',
  ],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'Players' },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
} satisfies ComponentMeta
