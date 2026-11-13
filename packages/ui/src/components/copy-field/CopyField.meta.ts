import type { ComponentMeta } from '@rotra/ui/meta'

export const copyFieldMeta = {
  name: 'CopyField',
  description:
    'A read-only link field with the copy icon button inside it on the right (44 px field, 34 px button). Used under the OR divider in every share dialog.',
  usage: [
    'Use for a link people copy: “Profile link”, “Link”, “Session link”.',
    'The copy button is named “Copy <label>” unless copyLabel is passed (“Copy profile link”).',
    'The caller copies and shows the toast: “Link copied”, or “Couldn’t copy. Your profile link is …”.',
    'Do not pair a text input with a separate Copy button any more; use this.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Share sheet › copyField (.copy-field, .cf-box, .cf-btn)',
  },
  docs: ['docs/mockup-changes/2026-11-13-share-dialog.md'],
  related: ['ShareImagePicker', 'ShareDialog'],
} satisfies ComponentMeta
