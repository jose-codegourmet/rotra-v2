import type { ComponentMeta } from '@rotra/ui/meta'
export const playerClubsCardMeta = {
  name: 'PlayerClubsCard',
  description: 'PlayerClubsCard for Player Information.',
  usage: [
    'Use on the matching Player Information screen.',
    'Each row offers Club page (the public club page, P07) when clubPageHref is set, then Leave club and Report a problem.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'Own profile' },
  variants: ['TwoClubs', 'Empty', 'LongName'],
} satisfies ComponentMeta
