import type { ComponentMeta } from '@rotra/ui/meta'
export const editProfileFormMeta = {
  name: 'EditProfileForm',
  description:
    'P-EDIT-PROFILE: Name, Playing style, Links and a read-only Account section sharing one draft and one Save changes, with a dot for unsaved edits and a count of fields to fix per section.',
  usage: [
    'The container owns useUpdateMyProfile, toasts, navigation and D-DISCARD; onDirtyChange tells it when to guard.',
    'Phone, email and the RTR ID are display-only; the submitted values never contain them.',
    'Submitting with errors opens the first section with one and focuses its first invalid field.',
  ],
  prototype: {
    file: 'app/mocksups-app/player-app/rotra-player.html',
    screen: 'Edit profile (viewEdit, EDIT_TABS, .edit-grid, .edit-nav, .edit-save)',
  },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
  variants: ['name', 'playing-style', 'links', 'account', 'pending', 'server-error'],
  related: ['PersonalDetailsFields', 'SectionNav'],
} satisfies ComponentMeta
