import type { ComponentMeta } from '@rotra/ui/meta'

export const clubCellMeta = {
  name: 'ClubCell',
  description:
    'The Club cell of an Admin club directory row: logo or initials, the club name that opens the club, its username, the running Queue Session and a name change request chip.',
  usage: [
    'Pass href (with linkComponent for Next Link) to render the name as a link, or onOpen for a button.',
    'Long names wrap; the username always stays visible under them.',
    'The running-session dot stops pulsing under reduced motion.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-CLUBS › viewClubs() › td[data-label="Club"] .who',
  },
  docs: ['docs/screens/product/modules/admin/clubs-licenses.md'],
  variants: ['default', 'running', 'name-requested', 'long-name', 'button'],
  related: ['ClubLogo', 'Chip', 'LicenseAccessChip', 'ClubPriceTag'],
} satisfies ComponentMeta
