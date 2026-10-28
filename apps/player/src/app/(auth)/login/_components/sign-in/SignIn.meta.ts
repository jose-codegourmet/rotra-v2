import type { ComponentMeta } from '@rotra/ui/meta'
export const signInMeta = {
  name: 'SignIn',
  description:
    'Connects prototype sign-in to mock phone/email matching, safe return navigation and offline state.',
  usage: ['Mock account flow only; no real authentication or email delivery.'],
  prototype: {
    file: 'docs/frames/player-app/rotra-player.html',
    screen: 'P-LOGIN / P-FORGOT / P-RESET',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
} satisfies ComponentMeta
