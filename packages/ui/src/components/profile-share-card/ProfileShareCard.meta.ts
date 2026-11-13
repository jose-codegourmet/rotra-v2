import type { ComponentMeta } from '@rotra/ui/meta'
export const profileShareCardMeta = {
  name: 'ProfileShareCard',
  description:
    'The own-profile Share profile: Story, Facebook post and Square images (picture, level, overall position, last 90 days wins; no QR) in ShareImagePicker, then OR and the Profile link field with the copy icon.',
  usage: ['Use in the Share profile sheet on the signed-in player’s own profile.'],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'My profile › Share profile',
  },
  variants: [
    'Ranked',
    'Light',
    'Phone',
    'RankedNoPosition',
    'NotRanked',
    'NoGames',
    'Initials',
    'Character',
    'WebShare',
  ],
} satisfies ComponentMeta
