import type { ComponentMeta } from '@rotra/ui/meta'

export const guestRegistrationMeta = {
  name: 'GuestRegistration',
  description:
    'Independent registration from a guest invitation, with existing-account confirmation and no club guest linkage.',
  usage: [
    'The club supplies RTR ID allocation context only. Contact matches require sign-in/recovery or correction, never an automatic merge.',
  ],
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
  related: ['ClaimForm', 'AccountLinkStatus'],
} satisfies ComponentMeta
