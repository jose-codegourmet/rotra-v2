import type { ComponentMeta } from '@rotra/ui/meta'

export const changeCompareMeta = {
  name: 'ChangeCompare',
  description:
    'Shows a requested change as Current → Requested: two labelled boxes with an arrow between them, the requested one accented.',
  usage: [
    'Use for club name change requests (bold) and player phone number or email change requests (mono).',
    'Pass toLabel="New" inside the approve name change sheet, as the prototype does.',
    'At 520 px and narrower the boxes stack and the arrow points down; long emails and RTR IDs wrap, nothing scrolls sideways.',
    'The screen passes "Not set" as from when there is no current value.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen:
      'A-CLUB-DETAIL › Name change request .change; A-CONTACT-REVIEW › .change with .mono values',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'docs/screens/product/modules/admin/players-requests.md',
  ],
  variants: ['bold', 'mono'],
  related: ['ValueTiles', 'ConfirmSheet'],
} satisfies ComponentMeta
