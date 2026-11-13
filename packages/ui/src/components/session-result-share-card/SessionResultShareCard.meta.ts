import type { ComponentMeta } from '@rotra/ui/meta'
export const sessionResultShareCardMeta = {
  name: 'SessionResultShareCard',
  description:
    'Share result: Story, Facebook post and Square images of one published session (standings position, games, W–L; no QR) in ShareImagePicker, then OR and the Link field.',
  usage: ['Use inside PlayerShareSheet (ShareDialog) for a published session result.'],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'Share result' },
  variants: ['AllSizes', 'Light', 'Phone', 'LongTitle'],
} satisfies ComponentMeta
