import type { ComponentMeta } from '@rotra/ui/meta'
export const phoneOrEmailInputMeta = {
  name: 'PhoneOrEmailInput', description: 'Formats phone digits as typed while preserving email text and caret position.', usage: ['Presentational only; containers own mutations and navigation.'],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'P-LOGIN / P-FORGOT / P-RESET' },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
} satisfies ComponentMeta
