import type { ComponentMeta } from '@rotra/ui/meta'

export const rosterPanelMeta = {
  name: 'RosterPanel',
  description:
    'The preparation "Roster and levels" panel: Mark all present / absent and Add player, the SlotMeter, the missing-level warning, and one RosterRow per confirmed slot.',
  usage: [
    'Use for the Roster and levels tab of a prepared Queue Session (Q-PREPARE).',
    'Mark all present shows only while someone is not present; Mark all absent only while someone is present.',
    'Do not use in the live console: Queue › Players shows locked levels and no remove action.',
    'Pass loading while the roster query runs: the panel shows Skeleton rows, never a spinner or fake names. levelsLocked turns every level into locked text.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › viewPrepare() roster tab',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/screens/product/modules/queue/players-roster.md',
    'docs/business_logic/product/queue/modules/players/README.md',
  ],
  related: ['RosterRow', 'SlotMeter', 'WaitlistPanel', 'Notice', 'EmptyState'],
} satisfies ComponentMeta
