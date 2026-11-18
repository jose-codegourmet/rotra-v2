import type { ComponentMeta } from '@rotra/ui/meta'

export const googleIdentityRowMeta = {
  name: 'GoogleIdentityRow',
  description:
    'A Google account as a row: the Google mark, the account name and email, a status chip and an optional helper line.',
  usage: [
    'chip "confirmed" shows "Email confirmed" under "Signs in with" on the Google registration form.',
    'chip "same-email" shows "Same email" on P-GOOGLE-LINK, beside the player\'s own profile row.',
    'Use helper for a short line under the email when a screen needs one. Long emails wrap.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-INVITE Google form, P-GOOGLE-LINK (gChip, .gid)',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/mockup-changes/2026-11-16-player-google-sign-in.md',
  ],
  variants: ['EmailConfirmed', 'SameEmail', 'WithHelper', 'LongEmail'],
  related: ['GoogleMark', 'Chip', 'SignInMethodsCard'],
} satisfies ComponentMeta
