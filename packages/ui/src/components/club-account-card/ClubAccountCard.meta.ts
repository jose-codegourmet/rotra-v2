import type { ComponentMeta } from '@rotra/ui/meta'

export const clubAccountCardMeta = {
  name: 'ClubAccountCard',
  description:
    "The club's one shared account on the club detail Overview tab: username, a password that is never shown, and when it was set up.",
  usage: [
    'It has no password prop on purpose: no Admin screen can render a password value.',
    'Club password recovery is an open decision, so there is no reset control; the copy says so.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-CLUB-DETAIL › Overview › Club account',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'docs/screens/product/open-decisions.md',
    'docs/business_logic/product/admin/modules/clubs-licenses/README.md',
  ],
  related: ['KeyValueList', 'Card', 'ClubIdentityCard'],
} satisfies ComponentMeta
