import type { ComponentMeta } from '@rotra/ui/meta'

export const snapCarouselMeta = {
  name: 'SnapCarousel',
  description:
    'The share dialog carousel as its own component: one horizontal strip of items you drag or swipe, snapping to the centre, with fade masks on a side that hides items and dots under it.',
  usage: [
    'Used by ShareImagePicker (the images) and IdentityPicker (the identity cards); use it for any other strip of cards that sits in a sheet.',
    'Pass one { id, node } per item. Each node is wrapped in a snap-centre item; give the wrapper its own look with itemClassName.',
    'Mouse drag or touch swipe; a drag never counts as a click on an item. dragIgnore names a selector (the eye button) whose mouse-down never starts a drag.',
    'Fade masks show only on a side with hidden items; the dots mark the centred item and are left out for one item.',
    'startAt opens the strip centred on that item once per set of items. className adjusts the strip (padding, card width variables).',
    'Native scroll-snap, no carousel dependency.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Share sheet › SHCAR / shCarInit / shCarSync (.sh-dlg .sh-tiles, .sh-car-nav)',
  },
  docs: [
    'docs/mockup-changes/2026-11-13-share-dialog-carousel.md',
    'docs/mockup-changes/2026-11-16-player-unclaimed-identity.md',
  ],
  related: ['ShareImagePicker', 'IdentityPicker', 'ShareDialog'],
} satisfies ComponentMeta
