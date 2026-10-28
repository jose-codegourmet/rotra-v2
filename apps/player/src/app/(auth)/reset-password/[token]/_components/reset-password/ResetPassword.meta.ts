import type { ComponentMeta } from '@rotra/ui/meta'
export const resetPasswordMeta = {
  name: 'ResetPassword',
  description: 'Validates and consumes an in-memory recovery link without storing a password.',
  usage: ['Mock account flow only; no real authentication or email delivery.'],
  prototype: {
    file: 'docs/frames/player-app/rotra-player.html',
    screen: 'P-LOGIN / P-FORGOT / P-RESET',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
} satisfies ComponentMeta
