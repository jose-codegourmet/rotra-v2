import type { ComponentMeta } from '@rotra/ui/meta'
export const playerIdBreakdownMeta = {
  name: 'PlayerIdBreakdown',
  description:
    "'What the ID means': the RTR ID split into ROTRA, country, city, first-synced date and sequence, with what each means.",
  usage: [
    'Use on P-ID-QR under PlayerIdQr.',
    'Pass the offline notice through offlineNotice when the ID is a saved copy.',
  ],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'My player ID (.rtr-parts)' },
  docs: [
    'docs/screens/product/modules/player-information/identity-privacy.md',
    'docs/business_logic/product/player-information/modules/identity/README.md',
  ],
  related: ['PlayerIdQr'],
} satisfies ComponentMeta
