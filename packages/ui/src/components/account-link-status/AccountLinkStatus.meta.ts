import type { ComponentMeta } from '@rotra/ui/meta'
export const accountLinkStatusMeta = {
  name: 'AccountLinkStatus', description: 'Generic reset acknowledgement and unusable recovery-link outcomes.', usage: ['Presentational only; containers own mutations and navigation.'],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'P-LOGIN / P-FORGOT / P-RESET' },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
} satisfies ComponentMeta
