import type { ComponentMeta } from '@rotra/ui/meta'

export const adminPlayerPictureSectionMeta = {
  name: 'AdminPlayerPictureSection',
  description:
    "The Profile picture section of Admin's Edit player form: preview, upload, initials, previous picture and the shown library characters, 8 per page.",
  usage: [
    'Player pictures are circles, on screen and in any downloaded image (D-2026-11-11-11).',
    'Inline inside the Edit player form, not a sheet and without a Done step; the form owns the draft and saves it with Save changes.',
    'Pass the draft as picture, the saved one as savedPicture, and only the shown library images as characters (upload order). A character in use that is no longer shown still appears in the preview, carrying its own image.',
    'Upload checks type (PNG, JPG, WebP) and size (1 MB) itself and calls onUpload only with a valid file; onUpload crops to a square and may throw when the file cannot be read.',
    'disabled switches every control off while the form saves. For the Player-facing dialog use ProfilePictureSheet.',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'Players › Quick view side panel › Edit › Profile picture',
  },
  docs: [
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/mockup-changes/2026-11-09-admin-edit-player-everything.md',
  ],
  variants: [
    'photo',
    'character',
    'initials',
    'with previous picture',
    'without previous picture',
    'upload error',
    'paged characters',
    'disabled',
  ],
  related: ['ProfilePictureSheet', 'Avatar', 'Pager', 'CharacterGrid'],
} satisfies ComponentMeta
