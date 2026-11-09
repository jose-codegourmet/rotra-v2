import type { ComponentMeta } from '@rotra/ui/meta'
export const sessionGamesShareCardMeta = {
  name: 'SessionGamesShareCard',
  description: 'Avatar-led game rows with prominent scores, three per Post or four per Story.',
  usage: ['Use on the matching Player Information screen.'],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'Share games' },
  variants: ['Post', 'Story', 'MoreThanEight'],
} satisfies ComponentMeta
