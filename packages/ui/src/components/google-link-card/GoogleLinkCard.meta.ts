import type { ComponentMeta } from '@rotra/ui/meta'

export const googleLinkCardMeta = {
  name: 'GoogleLinkCard',
  description:
    'P-GOOGLE-LINK: "Connect Google to your account?" for a password player who picked a Google account with the same email. Player row, Google row with Same email, Connect Google and sign in, Use my password instead.',
  usage: [
    'Never links silently: Connect Google and sign in is the one confirmation (useConfirmGoogleLink).',
    'Use my password instead needs no call; the container returns to P-LOGIN with the email filled.',
    'Copy says Google can be changed in Privacy and contact; it can never be disconnected (D-2026-11-16-01).',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-GOOGLE-LINK (viewGoogleLink)',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/mockup-changes/2026-11-18-player-google-link-copy.md',
  ],
  variants: ['Default', 'Pending', 'LongNames'],
  related: ['AuthCard', 'GoogleIdentityRow', 'PlayerAccountRow'],
} satisfies ComponentMeta
