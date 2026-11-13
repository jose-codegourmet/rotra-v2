import type { ComponentMeta } from '@rotra/ui/meta'
export const awardCardMeta = {
  name: 'AwardCard',
  description:
    'One award on the finished session page: the award pill, a big face (MVP with an accent ring, glow and the pixel fire), the name, “#N of M · W won · L lost”, the reason and Share.',
  usage: [
    'Inside PublicAwards only; the Queue Master’s Awards slide keeps its face rows (AwardsSlide).',
    '`tone="off"` is the small Off Day row card with a share icon (“Share Off Day: NAME”).',
    'Pass the name and picture already masked by the page’s rule; `onOpenFace` only for a signed-in viewer.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public session page › Details › Awards (pubAwards, .aw-card)',
  },
  docs: ['docs/mockup-changes/2026-11-13-queue-awards-faces-share.md'],
  variants: ['mvp', 'improved', 'off'],
  related: ['PublicAwards', 'AwardShareCard', 'PixelFire'],
} satisfies ComponentMeta
