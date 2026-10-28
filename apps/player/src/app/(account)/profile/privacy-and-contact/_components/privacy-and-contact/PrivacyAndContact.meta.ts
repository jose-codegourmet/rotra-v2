import type { ComponentMeta } from '@rotra/ui/meta'
export const privacyAndContactMeta = {
  name: 'PrivacyAndContact',
  description:
    "P-PHONE-PRIVACY container: the phone-privacy switch, the owner's contact details with the contact-change request status and sheet, and Sign out.",
  usage: [
    'Signed-out visitors never reach it: proxy.ts sends /profile/* to sign-in with returnTo.',
    'The switch shows only the saved value; a failed save keeps it and shows the error in the card and as a toast.',
    "Request a change opens P-CONTACT-REQUEST through useContactChangeSheet, shared with Edit profile.",
  ],
  prototype: {
    file: 'docs/frames/player-app/rotra-player.html',
    screen: 'Privacy and contact (viewAccount), SHEETS.request',
  },
  docs: [
    'docs/screens/product/modules/player-information/identity-privacy.md',
    'docs/business_logic/product/admin/modules/player-management/flow/contact-change.md',
  ],
  variants: ['loading', 'error', 'ready', 'saving', 'save-failed', 'request-open', 'offline'],
} satisfies ComponentMeta
