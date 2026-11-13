import type { ComponentMeta } from '@rotra/ui/meta'

export const shareImageViewerMeta = {
  name: 'ShareImageViewer',
  description:
    'The share dialog’s full-screen view: one share image on the black backdrop, scaled to fit (0.5× to 2.4×), with its name and Download under it.',
  usage: [
    'Opened by the eye on an image in ShareImagePicker; you rarely use it on its own.',
    'Esc, the × (“Close full screen”) or a tap on the backdrop closes it; Esc leaves the share dialog open.',
    'The backdrop and × use the photo viewer tokens, the same in both themes.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Share sheet › shViewer (.sh-view)',
  },
  docs: ['docs/mockup-changes/2026-11-13-share-dialog-big.md'],
  variants: ['story', 'post', 'square'],
  related: ['ShareImagePicker', 'PhotoViewer'],
} satisfies ComponentMeta
