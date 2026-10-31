import type { ComponentMeta } from '@rotra/ui/meta'
export const signInFormMeta = {
  name: 'SignInForm',
  description:
    'Prototype Player Information sign-in with phone/email, password visibility and recovery.',
  usage: ['Presentational only; containers own mutations and navigation.'],
  prototype: {
    file: 'app/mocksups-app/player-app/rotra-player.html',
    screen: 'P-LOGIN / P-FORGOT / P-RESET',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
} satisfies ComponentMeta
