import type { ComponentMeta } from '@rotra/ui/meta'

export const clubLoginFormMeta = {
  name: 'ClubLoginForm',
  description:
    'Q-LOGIN: the club account sign-in (username and password) inside the shared AuthCard, with Show/Hide password.',
  usage: [
    'Render it on the Queue sign-in route; the container passes onSubmit, isPending, serverError and offline from the mock sign-in mutation.',
    'Missing fields show one notice, "Enter your club username and password.", as the prototype does.',
    'offline shows "Signing in needs an internet connection. Try again when you\'re connected." and blocks submit; typed values stay.',
    'No forgot-password link, no sign-up and no social login (club passwords are reset by the platform owner).',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-LOGIN › viewLogin() (.login card)',
  },
  docs: [
    'docs/screens/product/modules/queue/access-home.md',
    'docs/screens/product/state-matrix.md',
    'docs/business_logic/product/queue/modules/offline/README.md#online-boundaries',
  ],
  related: ['AuthCard', 'Field', 'AccessGate'],
} satisfies ComponentMeta
