import type { ComponentMeta } from '@rotra/ui/meta'

export const playerAccountCardMeta = {
  name: 'PlayerAccountCard',
  description:
    "The Account card on the Admin player detail: Registered with its date, or Unclaimed when the club created the profile and the player hasn't registered.",
  usage: [
    'Admin only and read-only; the row chip for the same state is PlayerAccountChip.',
    'Pass the registration date as YYYY-MM-DD; without one a claimed player shows just Registered.',
    'Never shows a password, token or registration (claim) link.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-PLAYER-DETAIL › viewPlayer() › Account',
  },
  docs: [
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/business_logic/product/admin/modules/player-management/README.md',
  ],
  variants: ['registered', 'unclaimed'],
  related: ['KeyValueList', 'Card', 'PlayerAccountChip', 'PrivateContactCard'],
} satisfies ComponentMeta
