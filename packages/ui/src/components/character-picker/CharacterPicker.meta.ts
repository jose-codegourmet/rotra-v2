import type { ComponentMeta } from '@rotra/ui/meta'

export const characterPickerMeta = {
  name: 'CharacterPicker',
  description:
    'Profile picture › Or pick a character: 5 big round characters per row, 3 rows, 15 per page, a 3 px accent ring on the chosen one, with Previous / Page N of M / Next.',
  usage: [
    'Pass the shown library characters in order; it opens on the page holding selectedId.',
    'CHARACTER_PICKER_PAGE_SIZE (15) is the one page size: the Admin Profile characters copy (“15 per page”) reads it.',
    'Used inside ProfilePictureSheet under the “Or pick a character” label; the sheet owns the draft.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Profile picture sheet › Or pick a character (.av-grid, .av-pick)',
  },
  docs: [
    'docs/mockup-changes/2026-11-11-player-character-picker-circles.md',
    'docs/screens/product/modules/player-information/profile.md',
  ],
  related: ['ProfilePictureSheet', 'Avatar', 'Pager', 'CharacterGrid'],
} satisfies ComponentMeta
