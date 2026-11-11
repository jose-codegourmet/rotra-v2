import type { ComponentMeta } from '@rotra/ui/meta'
export const profileNotFoundMeta = {
  name: 'ProfileNotFound',
  description: 'Neutral state for an unmatched full RTR ID lookup.',
  usage: [
    'Supports visitor privacy states for Player Information.',
    'Use on the public profile route when lookup returns no profile.',
    'alwaysPrivate shows the private card “This player keeps their profile private.” with no sign-in button (D-2026-11-12-01).',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'viewNotFound() · viewPrivateGate()',
  },
} satisfies ComponentMeta
