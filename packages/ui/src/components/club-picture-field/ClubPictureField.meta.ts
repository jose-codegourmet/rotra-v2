import type { ComponentMeta } from '@rotra/ui/meta'

export const clubPictureFieldMeta = {
  name: 'ClubPictureField',
  description:
    'The club-set picture of a guest or unclaimed player (D-2026-11-09-12): the current picture, Upload photo, Remove, Use previous picture and the character grid (8 per page).',
  usage: [
    'Edit details › Profile picture: every choice applies at once (the container calls the picture mutation).',
    'Add player › New player (Saved players only): the form holds the choice and saves it after Save player; pass label "Profile picture (optional)" and a hint without the keep-two sentence.',
    'The caller reads and crops the file; the field only checks it is an image under 4 MB.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'picEditor() in SHEETS.editPlayer; newPicEditor() in SHEETS.add › New player',
  },
  docs: [
    'docs/screens/product/modules/queue/players-roster.md',
    'docs/mvp/decisions/2026-11-09.md#d-2026-11-09-12',
  ],
  related: ['EditPlayerDetailsForm', 'NewPlayerForm', 'Avatar', 'Pager'],
} satisfies ComponentMeta
