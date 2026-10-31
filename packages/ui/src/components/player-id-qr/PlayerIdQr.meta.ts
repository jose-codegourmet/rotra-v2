import type { ComponentMeta } from '@rotra/ui/meta'
export const playerIdQrMeta = {
  name: 'PlayerIdQr',
  description:
    'The My player ID card: a QR code holding only the RTR ID text, the ID in large mono type and Copy ID.',
  usage: [
    'Use on P-ID-QR for the signed-in player. Pass only the RTR ID; never a phone, email, claim token or URL.',
    'Use PlayerIdLine for the compact ID row on a profile.',
  ],
  prototype: {
    file: 'app/mocksups-app/player-app/rotra-player.html',
    screen: 'My player ID (viewId, qrSVG)',
  },
  docs: [
    'docs/screens/product/modules/player-information/identity-privacy.md',
    'docs/business_logic/product/player-information/modules/identity/README.md',
  ],
  related: ['PlayerIdBreakdown', 'PlayerIdLine'],
} satisfies ComponentMeta
