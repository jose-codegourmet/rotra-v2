import type { ComponentMeta } from '@rotra/ui/meta'
export const rankShareCardMeta = {
  name: 'RankShareCard',
  description:
    'Share rank: Story, Facebook post and Square images (level, overall position, skill ladder; no QR) in ShareImagePicker, then OR and the Link field.',
  usage: ['Use inside PlayerShareSheet (ShareDialog) on the own profile’s Share rank.'],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'Shared rank › Share' },
  variants: ['AllSizes', 'Light', 'Phone', 'NoPosition', 'WebShare'],
} satisfies ComponentMeta
