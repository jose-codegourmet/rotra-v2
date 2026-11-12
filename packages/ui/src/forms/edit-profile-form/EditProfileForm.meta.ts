import type { ComponentMeta } from '@rotra/ui/meta'
export const editProfileFormMeta = {
  name: 'EditProfileForm',
  description:
    'P-EDIT-PROFILE: Name, Playing style, Links and a read-only Account section sharing one draft and one Save changes, with a dot for unsaved edits and a count of fields to fix per section.',
  usage: [
    'The container owns useUpdateMyProfile, toasts, navigation and D-DISCARD; onDirtyChange tells it when to guard.',
    'Name opens with a live preview of the profile card (ProfileHero placement="preview"): the 5:2 banner with its pencil (onChangeBanner), the picture with its pencil (onChangePicture), the name and nickname as typed, then the helper line “This is how the top of your profile card looks. Tap a pencil to change your picture or banner.”',
    'Both pencils open dialogs the container owns (ProfilePictureSheet, BannerSheet); their saves are outside the draft and Save changes. There is no inline banner picker (#765). bannerKey / bannerImageUrl are the saved banner.',
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
    'docs/mockup-changes/2026-11-12-player-profile-banner-layout-dialog.md',
    'docs/mockup-changes/2026-11-11-player-edit-profile-links-rows.md',
  ],
  variants: ['name', 'playing-style', 'links', 'account', 'pending', 'server-error'],
  related: ['PersonalDetailsFields', 'SectionNav', 'ProfileHero', 'BannerSheet'],
} satisfies ComponentMeta
