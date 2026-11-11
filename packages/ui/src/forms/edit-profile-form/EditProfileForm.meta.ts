import type { ComponentMeta } from '@rotra/ui/meta'
export const editProfileFormMeta = {
  name: 'EditProfileForm',
  description:
    'P-EDIT-PROFILE: Name, Playing style, Links and a read-only Account section sharing one draft and one Save changes, with a dot for unsaved edits and a count of fields to fix per section.',
  usage: [
    'The container owns useUpdateMyProfile, toasts, navigation and D-DISCARD; onDirtyChange tells it when to guard.',
    'Name opens with a live preview of the profile card (ProfileHero placement="preview"): the banner, the picture with its pencil (onChangePicture, outside the draft and Save), and the name and nickname as typed, then the helper line and the Banner swatches.',
    'The Banner swatches (BannerPicker) show only with onBannerChange; a pick applies at once, outside Save changes. The container saves it and shows the toast “Banner updated”. bannerKey / bannerImageUrl are the saved banner, banners the shown Admin set, bannerDisabled while saving or offline.',
    'Links stack one per row at every width.',
    'Phone, email and the RTR ID are display-only; the submitted values never contain them.',
    'Submitting with errors opens the first section with one and focuses its first invalid field.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Edit profile (viewEdit, EDIT_TABS, .edit-grid, .edit-nav, .edit-save)',
  },
  docs: [
    'docs/screens/product/modules/player-information/profile.md',
    'docs/mockup-changes/2026-11-11-player-profile-banner.md',
    'docs/mockup-changes/2026-11-11-player-edit-profile-links-rows.md',
  ],
  variants: ['name', 'playing-style', 'links', 'account', 'pending', 'server-error'],
  related: ['PersonalDetailsFields', 'SectionNav', 'ProfileHero', 'BannerPicker'],
} satisfies ComponentMeta
