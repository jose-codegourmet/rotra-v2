import type { ComponentMeta } from '@rotra/ui/meta'

export const googleMarkMeta = {
  name: 'GoogleMark',
  description:
    'The four-colour Google "G", drawn with the --g-* tokens. Decorative: the text beside it names the action.',
  usage: [
    'Use inside GoogleButton, GoogleIdentityRow and SignInMethodsCard. Never as the only content of a control.',
    'The colours are the Google mark only and stay the same in both themes; do not reuse the --g-* tokens elsewhere.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'G_MARK (P-LOGIN, P-INVITE, P-GOOGLE-LINK, Sign-in methods)',
  },
  docs: ['docs/mockup-changes/2026-11-16-player-google-sign-in.md'],
  variants: ['Default'],
  related: ['GoogleButton', 'GoogleIdentityRow'],
} satisfies ComponentMeta
