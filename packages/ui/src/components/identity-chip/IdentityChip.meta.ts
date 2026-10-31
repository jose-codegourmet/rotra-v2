import type { ComponentMeta } from '@rotra/ui/meta'

export const identityChipMeta = {
  name: 'IdentityChip',
  description:
    'Shows whether a club player is Registered (claimed Player Information account), Unclaimed (profile not yet claimed), a Guest, or waiting on a Lookup.',
  usage: [
    "Use wherever a Queue screen shows a player's identity: saved players, roster, add player, profile.",
    'The words are fixed; colour only reinforces them (Registered accent, Lookup pending warn).',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Saved players › card footer (identChip)',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md', 'docs/product-terms.md'],
  variants: ['registered', 'unclaimed', 'guest', 'pending'],
  related: ['SavedPlayerCard', 'Chip'],
} satisfies ComponentMeta
