import type { ComponentMeta } from '@rotra/ui/meta'
export const awardShareCardMeta = {
  name: 'AwardShareCard',
  description:
    'The award share images in three sizes: one award (winner, award big in the accent, standing, reason, date) or the whole set (Share awards, Share Off Day), then OR and the Session link.',
  usage: [
    'Put it inside ShareDialog titled “Share MVP”, “Share Most Improved”, “Share Off Day”, “Share awards”.',
    '`kind="award"` for one card’s Share; `kind="set"` for the section’s Share awards (MVP first, outlined) or Share Off Day.',
    'Names and pictures follow the page’s masking rule; pass them already masked.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.shareFinish (kind award, awards)',
  },
  docs: ['docs/mockup-changes/2026-11-13-queue-awards-faces-share.md'],
  related: ['ShareDialog', 'ShareImagePicker', 'AwardCard', 'PublicAwards'],
} satisfies ComponentMeta
