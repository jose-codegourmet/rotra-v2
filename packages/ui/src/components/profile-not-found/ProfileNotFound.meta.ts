import type { ComponentMeta } from '@rotra/ui/meta'
export const profileNotFoundMeta = {
  name: 'ProfileNotFound',
  description: 'Neutral state for an unmatched full RTR ID lookup.',
  usage: ['Use on the public profile route when lookup returns no profile.'],
  prototype: { file: 'app/mocksups-app/player-app/rotra-player.html', screen: 'viewNotFound()' },
} satisfies ComponentMeta
