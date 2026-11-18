import type { ComponentMeta } from '@rotra/ui/meta'

export const signInMethodsCardMeta = {
  name: 'SignInMethodsCard',
  description:
    'The Sign-in methods card on Privacy and contact: the Google row, the Email and password row, the "Google sign-in is required…" footer and the row that opens the Verification page.',
  usage: [
    'Google connected: "Connected · <email>" (plus "(different from your ROTRA email)" when the emails differ), a Required chip and Change. Not connected: "Not connected" and Connect Google.',
    'Email and password: "Password set · <email>" (no Google yet), "Backup only until <deadline>" (Google connected) or "Not used" (hasPassword false).',
    'The deadline is passed in already formatted; never hardcode a date here.',
    'The verification chip text and state come from the Verification page logic (P13); this card only shows them. Without verificationLabel and onOpenVerification the verification row is hidden.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'viewAccount › Sign-in methods (P-PHONE-PRIVACY)',
  },
  docs: [
    'docs/screens/product/modules/player-information/identity-privacy.md',
    'docs/mockup-changes/2026-11-16-player-google-sign-in.md',
  ],
  variants: [
    'google',
    'no-google',
    'different-google-email',
    'no-password',
    'verified',
    'no-verification-row',
  ],
  related: ['GoogleIdentityRow', 'GoogleMark', 'Chip', 'AnnouncementBand'],
} satisfies ComponentMeta
