import type { ComponentMeta } from '@rotra/ui/meta'

export const privateContactCardMeta = {
  name: 'PrivateContactCard',
  description:
    "The Private contact card on the Admin player detail: the player's login phone and email, how they sign in, and whether clubs see the phone.",
  usage: [
    'Admin only. Pass the applied contacts; a pending or approved-but-unapplied request never changes what this card shows.',
    "Missing phone or email shows 'Not given'. Phones are E.164 and shown grouped.",
    "Phone shown to clubs: 'Entered by the club' while unclaimed, otherwise the player's privacy choice.",
    'There is deliberately no password, token or claim-link prop, and no edit control: players change contacts by request.',
    "The player's own Privacy and contact view is ContactDetailsCard.",
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-PLAYER-DETAIL › viewPlayer() › Private contact',
  },
  docs: [
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/screens/product/experience-contract.md#sensitive-and-optional-information',
  ],
  variants: ['registered', 'hidden', 'unclaimed'],
  related: ['KeyValueList', 'Card', 'ContactDetailsCard', 'ContactRequestList'],
} satisfies ComponentMeta
