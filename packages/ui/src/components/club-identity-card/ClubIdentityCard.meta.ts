import type { ComponentMeta } from '@rotra/ui/meta'

export const clubIdentityCardMeta = {
  name: 'ClubIdentityCard',
  description:
    "A club's fixed identity on the club detail Overview tab: founding address, city code and any earlier names.",
  usage: [
    'Admin only and read-only; the Queue club settings identity (logo, name requests) is ClubIdentityPanel.',
    'Earlier names show only when there are some, comma-separated.',
    'The founding address is never a session venue; the running session venue lives in ActiveSessionCard.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'A-CLUB-DETAIL › Overview › Identity',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'docs/business_logic/product/admin/modules/clubs-licenses/README.md',
  ],
  related: ['KeyValueList', 'Card', 'ClubIdentityPanel', 'ActiveSessionCard'],
} satisfies ComponentMeta
