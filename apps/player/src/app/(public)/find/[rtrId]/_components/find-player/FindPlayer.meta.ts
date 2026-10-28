import type { ComponentMeta } from '@rotra/ui/meta'
export const findPlayerMeta = {
  name: 'FindPlayer',
  description: 'Looks up an exact public RTR ID and replaces the route with the matching profile.',
  usage: ['Never fall back to matching another player by name.'],
  prototype: {
    file: 'docs/frames/player-app/rotra-player.html',
    screen: 'FORM.find / Profile not found',
  },
  docs: ['docs/screens/product/modules/player-information/ranking-history.md'],
  related: ['ProfileNotFound'],
} satisfies ComponentMeta
