import type { ComponentMeta } from '@rotra/ui/meta'
export const profileShareCardMeta = {
  name: 'ProfileShareCard',
  description:
    'The own-profile Share profile card (Post and Story): picture, level, overall position, last 90 days wins, QR, and a read-only Profile link field with Copy.',
  usage: ['Use in the Share profile sheet on the signed-in player’s own profile.'],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'My profile › Share profile',
  },
  variants: [
    'Ranked',
    'Story',
    'RankedNoPosition',
    'NotRanked',
    'NoGames',
    'Initials',
    'Character',
    'WebShare',
  ],
} satisfies ComponentMeta
