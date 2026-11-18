import type { ComponentMeta } from '@rotra/ui/meta'

export const googleRequiredCardMeta = {
  name: 'GoogleRequiredCard',
  description:
    'P-GOOGLE-REQUIRED: "Connect Google to continue" for a password-only player after the deadline. Player row, Connect <tried email> when one was tried, Connect Google or Use another Google account, I don\'t have a Google account, Sign out.',
  usage: [
    'Presentational: the container reads the deadline (useGoogleDeadline) and connects through useConnectGoogle.',
    'Pass triedEmail only when the player tried a Google email on P-LOGIN that was not connected (useGoogleTriedEmail); the Google button then reads "Use another Google account".',
    'While pending (Google\'s window open or connecting) the Google button shows "Waiting for Google…".',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-GOOGLE-REQUIRED (viewGoogleRequired)',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/mockup-changes/2026-11-16-player-google-sign-in.md',
  ],
  variants: ['Default', 'WithTriedEmail', 'Pending', 'LongEmail'],
  related: ['AuthCard', 'GoogleButton', 'PlayerAccountRow', 'NoGoogleAccountSheet'],
} satisfies ComponentMeta
