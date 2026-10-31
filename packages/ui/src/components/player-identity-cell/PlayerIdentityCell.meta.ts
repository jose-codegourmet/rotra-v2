import type { ComponentMeta } from '@rotra/ui/meta'

export const playerIdentityCellMeta = {
  name: 'PlayerIdentityCell',
  description:
    "The Player cell of an Admin row: initials avatar, the player's name and either their nickname (Players directory) or their permanent RTR ID (contact requests).",
  usage: [
    'directory: the Players list row; the nickname shows in quotes under the name when there is one.',
    'request: contact request rows and review; the RTR ID shows under the name so two people with the same name are told apart.',
    'Pass href (with linkComponent for Next Link) or onOpen to make the name open the player; otherwise it is plain bold text.',
    'Long names and RTR IDs wrap. Phones and emails are never passed to or shown by this cell.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen:
      'A-PLAYERS › viewPlayers() › td[data-label="Player"] .who; contact requests › td[data-label="Player"] .who',
  },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
  variants: ['directory', 'request'],
  related: ['Avatar', 'ClubCell', 'PlayerAccountChip', 'RankStatusChip', 'SameNameNotice'],
} satisfies ComponentMeta
