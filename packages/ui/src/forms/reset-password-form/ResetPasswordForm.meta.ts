import type { ComponentMeta } from '@rotra/ui/meta'
export const resetPasswordFormMeta = {
  name: 'ResetPasswordForm',
  description: 'New password and matching confirmation for a validated mock recovery link.',
  usage: ['Presentational only; containers own mutations and navigation.'],
  prototype: {
    file: 'app/mocksups-app/player-app/rotra-player.html',
    screen: 'P-LOGIN / P-FORGOT / P-RESET',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
} satisfies ComponentMeta
