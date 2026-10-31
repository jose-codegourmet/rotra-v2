import type { ComponentMeta } from '@rotra/ui/meta'
export const forgotPasswordFormMeta = {
  name: 'ForgotPasswordForm',
  description: 'Email-based mock password recovery request without revealing account existence.',
  usage: ['Presentational only; containers own mutations and navigation.'],
  prototype: {
    file: 'app/mocksups-app/player-app/rotra-player.html',
    screen: 'P-LOGIN / P-FORGOT / P-RESET',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
} satisfies ComponentMeta
