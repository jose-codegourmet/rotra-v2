import type { ComponentMeta } from '@rotra/ui/meta'
export const forgotPasswordMeta = {
  name: 'ForgotPassword',
  description: 'Shows a generic mock reset acknowledgement without account-existence disclosure.',
  usage: ['Mock account flow only; no real authentication or email delivery.'],
  prototype: {
    file: 'docs/frames/player-app/rotra-player.html',
    screen: 'P-LOGIN / P-FORGOT / P-RESET',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
} satisfies ComponentMeta
