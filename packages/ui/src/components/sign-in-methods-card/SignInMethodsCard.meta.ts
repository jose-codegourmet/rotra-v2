import type { ComponentMeta } from '@rotra/ui/meta'

export const signInMethodsCardMeta = {
  name: 'SignInMethodsCard',
  description:
    'The Sign-in methods card on Privacy and contact: the Google row, the Email and password row, the "Google sign-in is required…" footer and the row that opens the Verification page.',
  usage: [
    'Google connected: "Connected · <email>" (plus "(different from your ROTRA email)" when the emails differ), a Required chip and Change. Not connected: "Not connected" and Connect Google.',
    'Email and password: "Password set · <email>" (no Google yet), "Backup only until <deadline>" (Google connected) or "Not used" (hasPassword false).',
    'The deadline is passed in already formatted; never hardcode a date here.',
    'Pass the owner’s verification status and onOpenVerification to show the verification row.',
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
  related: ['GoogleIdentityRow', 'GoogleMark', 'VerificationStatusChip', 'AnnouncementBand'],
} satisfies ComponentMeta
