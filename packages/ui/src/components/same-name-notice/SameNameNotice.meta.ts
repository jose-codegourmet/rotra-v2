import type { ComponentMeta } from '@rotra/ui/meta'

export const sameNameNoticeMeta = {
  name: 'SameNameNotice',
  description:
    'The warn notice that keeps two player identities with the same name from being confused or merged: one line per shared name on the Players list, or the other same-name players with their RTR IDs on player detail.',
  usage: [
    'list: above the Players results while a search is active; pass the names that appear more than once with their counts.',
    'detail: under the player detail hero; pass the other players with the same name, each with href (and linkComponent) or use onOpenPlayer.',
    'Renders nothing for an empty list. Never offers a merge or link action; Admin does not merge players.',
    'Shows names and RTR IDs only, never phones or emails.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-PLAYERS › viewPlayers() dupes notice; A-PLAYER-DETAIL › viewPlayer() twin notice',
  },
  docs: [
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/business_logic/product/admin/modules/player-management/README.md',
  ],
  variants: ['list', 'detail'],
  related: ['Notice', 'PlayerIdentityCell'],
} satisfies ComponentMeta
