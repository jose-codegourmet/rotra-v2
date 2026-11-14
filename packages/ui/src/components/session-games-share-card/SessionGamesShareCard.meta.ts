import type { ComponentMeta } from '@rotra/ui/meta'
export const sessionGamesShareCardMeta = {
  name: 'SessionGamesShareCard',
  description:
    'Share games: avatar-led game rows with prominent scores, four on Story, three on Facebook post, two on Square (no QR), in ShareImagePicker, then OR and the Link field. Square is top-aligned; Story and Facebook post centre the content and set it larger (the prototype .sh-card rules).',
  usage: [
    'Use on the matching Player Information screen.',
    'Uses player names and green borders on winning-side avatars in the preview and PNG.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'Share games' },
  variants: ['AllSizes', 'Light', 'Phone', 'MoreThanEight', 'Singles'],
} satisfies ComponentMeta
