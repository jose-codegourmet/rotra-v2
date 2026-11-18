import type { ComponentMeta } from '@rotra/ui/meta'

export const shareImagePickerMeta = {
  name: 'ShareImagePicker',
  description:
    'The body of every share dialog: the images at full size in a compact carousel, pick several, view one full screen, Download N images or Share the picked ones, then the big OR and the link field.',
  usage: [
    'Put it inside ShareDialog. Pass one item per image: id, label, hint, format, fileName and a ShareImage.',
    'For the three sizes use SHARE_FORMATS from @rotra/ui/share-card/helpers (Story, Facebook post, Square with their hints).',
    'Carousel: mouse drag or touch swipe, snapping to the centre; a drag never counts as a click; fade masks only on a side with hidden images; dots mark the centred image. The strip is SnapCarousel; native scroll-snap (no carousel dependency).',
    'Tapping an image picks or unpicks it (accent border, check badge); every image starts picked; “N of M picked · Pick all / Clear”. Download and Share are disabled with nothing picked.',
    'The eye (on hover; always on touch) opens ShareImageViewer with Download for that one image.',
    'Share shows only where the system share sheet takes files (webShare overrides the check in stories).',
    'iPhone and iPad (with Web Share): Download N images becomes Save to Photos, which opens the share sheet with the picked PNGs, and a hint says “Save to Photos opens the share menu. Tap Save Image there.” (“Save N Images” for several). Safari saves downloads to Files, so this is how images reach Photos. saveToPhotos overrides the check in stories. The full-screen view’s button reads Save to Photos too.',
    'images maps each data-qr-logo key (spot, game avatars) to its picture URL so the PNG draws it.',
    'Share leaderboard: pass its size switch as toolbar and countUnit { one: "image", other: "images" }.',
    'onDownloaded runs once per image: toast “<label> image downloaded”. onCopy shows “Link copied” or the clipboard failure.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Share sheet › SHEETS.share, shPick, SHCAR / shCarInit / shCarSync, copyField',
  },
  docs: [
    'docs/mockup-changes/2026-11-13-share-dialog.md',
    'docs/mockup-changes/2026-11-13-share-dialog-big.md',
    'docs/mockup-changes/2026-11-13-share-dialog-carousel.md',
    'docs/mockup-changes/2026-11-15-share-save-to-photos.md',
  ],
  variants: ['all-picked', 'some-picked', 'none-picked', 'toolbar', 'no-link', 'save-to-photos'],
  related: ['ShareDialog', 'ShareImage', 'ShareImageViewer', 'CopyField', 'SnapCarousel'],
} satisfies ComponentMeta
