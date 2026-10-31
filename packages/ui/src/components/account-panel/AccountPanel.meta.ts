import type { ComponentMeta } from '@rotra/ui/meta'
export const accountPanelMeta = {
  name: 'AccountPanel',
  description:
    "The dashed 'Your account · Only you see this' panel: the owner's phone, email and phone privacy, with Privacy and contact and Sign out.",
  usage: [
    'Render only on P-OWN-PROFILE after ownership is checked. Never on a public profile or in a public story.',
    'Contact changes are requested in P04; requestSlot shows an open request chip.',
  ],
  prototype: {
    file: 'app/mocksups-app/player-app/rotra-player.html',
    screen: 'Profile › privatePanel()',
  },
  docs: [
    'docs/screens/product/modules/player-information/profile.md',
    'docs/business_logic/product/player-information/modules/identity/README.md',
  ],
  variants: ['phone-hidden', 'phone-visible', 'with-request'],
  related: ['PlayerIdentityCard', 'ProfileLayout'],
} satisfies ComponentMeta
