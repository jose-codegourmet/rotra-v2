import type { ComponentMeta } from '@rotra/ui/meta'

export const rosterRowMeta = {
  name: 'RosterRow',
  description:
    'One confirmed slot on the preparation roster: picture, name, identity chip, the Player Information suggestion, the level select with its diff indicator, the Present switch and remove.',
  usage: [
    'Use inside RosterPanel for every player with a slot in a prepared session.',
    'Do not use in the live console: Queue › Players shows locked levels and no remove action (PlayerPoolCard).',
    'The level select is highlighted while the level is missing; pass levelLocked once the session started.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › Roster and levels tab (.prow)',
  },
  docs: [
    'docs/screens/product/modules/queue/players-roster.md',
    'docs/business_logic/product/queue/modules/players/README.md',
  ],
  related: ['RosterPanel', 'LevelSelect', 'LevelDiffIndicator', 'IdentityChip', 'Switch'],
} satisfies ComponentMeta
