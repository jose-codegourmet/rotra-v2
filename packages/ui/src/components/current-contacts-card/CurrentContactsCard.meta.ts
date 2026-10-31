import type { ComponentMeta } from '@rotra/ui/meta'

export const currentContactsCardMeta = {
  name: 'CurrentContactsCard',
  description:
    'The side card on the Admin contact review: the player (name links to their detail, RTR ID under it), account state and the phone and email in use right now.',
  usage: [
    'Admin only, beside the Requested change card on A-CONTACT-REVIEW.',
    'Pass the applied contacts only; an approved but unapplied request never changes what this card shows.',
    "Missing phone or email shows 'Not given'. Phones are E.164 and shown grouped.",
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'A-CONTACT-REVIEW › viewReview() › player and current contacts card',
  },
  docs: [
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/screens/product/experience-contract.md#sensitive-and-optional-information',
  ],
  variants: ['registered', 'unclaimed'],
  related: ['PlayerIdentityCell', 'KeyValueList', 'RequestedChangeCard', 'PrivateContactCard'],
} satisfies ComponentMeta
