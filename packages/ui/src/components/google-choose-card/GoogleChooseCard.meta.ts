import type { ComponentMeta } from '@rotra/ui/meta'

export const googleChooseCardMeta = {
  name: 'GoogleChooseCard',
  description:
    'The card under the invite card on P-INVITE ("New to ROTRA?") and the method step of P-CLAIM ("Connect your Google account"): Continue with Google, I don\'t have a Google account, a muted line and, on P-INVITE, the "Already on ROTRA?" divider with Sign in.',
  usage: [
    'P-INVITE: title "New to ROTRA?", the hint "ROTRA accounts sign in with Google. You don\'t need a password, and you add your mobile number next.", and signIn ("Sign in to join" / "Sign in to continue" / "Sign in to your account").',
    'P-CLAIM: no title and no signIn; the page heading holds "Connect your Google account". error shows a Google account that is already on another ROTRA account.',
    'The app starts Google through useGooglePicker and opens the No Google account sheet through useNoGoogleSheet; the card only draws the buttons.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-INVITE (viewInvite .choose-card), P-CLAIM (viewClaim method step)',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/mockup-changes/2026-11-16-player-google-sign-in.md',
  ],
  variants: ['Default', 'Pending', 'WithError', 'ClaimStep'],
  related: ['GoogleButton', 'InviteCard', 'NoGoogleAccountSheet'],
} satisfies ComponentMeta
