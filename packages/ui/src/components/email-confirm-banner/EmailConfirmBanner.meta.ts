import type { ComponentMeta } from '@rotra/ui/meta'
export const emailConfirmBannerMeta = {
  name: 'EmailConfirmBanner',
  description: 'EmailConfirmBanner for Player Information.',
  usage: ['Use on the matching Player Information screen.'],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Registration and own profile',
  },
  variants: ['Default', 'Pending', 'Resent', 'Prototype', 'LongEmail', 'Failure'],
} satisfies ComponentMeta
