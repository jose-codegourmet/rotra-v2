import type { ComponentMeta } from '@rotra/ui/meta'

export const waitlistPanelMeta = {
  name: 'WaitlistPanel',
  description:
    'The first-come waitlist of a Queue Session: slots used against the budget, Fill N open slots, and one row per waiting player with Give slot (or Give slot anyway over budget) and remove.',
  usage: [
    'Use for the Waitlist tab in preparation (Q-PREPARE) and in the live Players view when someone waits or the slots are full.',
    'Rows keep the order players joined; the panel never reorders them.',
    'Mutations stay in the container: the panel only reports Fill, Give slot, Remove and profile taps.',
    'Pass loading while the roster query runs: the panel shows Skeleton rows in place of the list.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › Waitlist tab (waitlistPanel())',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/screens/product/modules/queue/players-roster.md',
    'docs/business_logic/product/queue/modules/players/README.md',
  ],
  related: ['RosterPanel', 'SlotMeter', 'Avatar', 'IconButton'],
} satisfies ComponentMeta
