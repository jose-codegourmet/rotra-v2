import type { ComponentMeta } from '@rotra/ui/meta'

export const noGoogleAccountSheetMeta = {
  name: 'NoGoogleAccountSheet',
  description:
    'The "No Google account?" sheet: make a free Google account with the email you already use, in four steps, then come back. One button, Got it.',
  usage: [
    'Controlled by open and onOpenChange only; it needs no data, so any screen can open it (P-LOGIN invite flow, P-INVITE, P-GOOGLE-REQUIRED, the announcement band).',
    'Copy is word for word from access-registration.md; do not reword per screen.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'SHEETS.noGoogle',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/mockup-changes/2026-11-16-player-google-sign-in.md',
  ],
  variants: ['Open'],
  related: ['Sheet', 'GoogleButton'],
} satisfies ComponentMeta
