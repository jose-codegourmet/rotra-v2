import type { ComponentMeta } from '@rotra/ui/meta'

export const rosterRowMeta = {
  name: 'RosterRow',
  description:
    'One confirmed slot on the preparation roster: picture, name, identity chip, the Player Information suggestion, the level select with its diff indicator, the Present switch and remove.',
  usage: [
    'Pass onStepDown for the secondary Move to waitlist button next to remove (#735); it also shows in the read-only summary after Start.',
    'Pass selfCheckedInAt or leftAt timestamps for the muted presence caption; the caller owns clearing rules.',
    'presencePending shows Saving presence… without disabling the switch; the data batch owns optimistic values and rollback.',
    'Before Start session the route passes showPresence=false: no Present text or switch, remove stays. Read-only Session settings passes readOnly for locked level and presence text without removal or presence controls.',
    'Use inside RosterPanel for every player with a slot in a prepared session.',
    'Do not use in the live console: Queue › Players shows locked levels and no remove action (PlayerPoolCard).',
    'Do not use for the Grid view: that is RosterCard.',
    'The level select is highlighted while the level is missing; pass levelLocked once the session started: the level becomes text with a lock icon and "Level locked for this session", no edit path.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › Roster and levels tab (.prow)',
  },
  docs: [
    'docs/screens/product/modules/queue/players-roster.md',
    'docs/business_logic/product/queue/modules/players/README.md',
  ],
  related: [
    'RosterPanel',
    'RosterCard',
    'LevelSelectMenu',
    'LevelDiffIndicator',
    'IdentityChip',
    'Switch',
  ],
} satisfies ComponentMeta
