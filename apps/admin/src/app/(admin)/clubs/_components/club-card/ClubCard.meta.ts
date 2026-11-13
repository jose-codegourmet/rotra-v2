import type { ComponentMeta } from '@rotra/ui/meta'

export const clubCardMeta = {
  name: 'ClubCard',
  description:
    'A-CLUBS club profile card (D-CLUB-PROFILE): ClubProfileCard in the right-hand panel with the default banner, round logo, name and username, access chips, the club’s details (Founded in, Address, Set up, Plan, Until, Price) and Running now; Open club goes to the club detail.',
  usage: [
    'Opened by ClubDirectory from a row or its name (instead of going straight to the detail page).',
    'Address and Set up come from useAdminClub; the rest from the directory row.',
  ],
  prototype: { file: 'apps/mockup/admin-app/rotra-admin.html', screen: 'clubCardSheet' },
  docs: ['docs/screens/product/modules/admin/clubs-licenses.md', 'docs/screens/product/dialogs.md'],
  related: ['ClubProfileCard', 'ClubDirectory'],
} satisfies ComponentMeta
