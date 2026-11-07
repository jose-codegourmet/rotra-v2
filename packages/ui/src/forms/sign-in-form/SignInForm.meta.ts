import type { ComponentMeta } from '@rotra/ui/meta'
export const signInFormMeta = {
  name: 'SignInForm',
  description:
    'Player Information sign-in with email, password visibility and recovery. Prototype hints only with prototypeHints (mock data).',
  usage: ['Presentational only; containers own mutations and navigation.'],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-LOGIN / P-FORGOT / P-RESET',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
} satisfies ComponentMeta
