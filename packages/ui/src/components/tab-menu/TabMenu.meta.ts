import type { ComponentMeta } from '@rotra/ui/meta'

export const tabMenuMeta = {
  name: 'TabMenu',
  description: 'A full-width menu for switching tabs on a phone, showing counts and the current selection.',
  usage: [
    'Use for the Preparation and roster level tabs on phones; use Tabs with phoneMenu for tab panels.',
    'Pass the current value and update it through onChange. Disabled entries cannot be selected.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Session preparation › tab row and Roster and levels › level tabs',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['Tabs', 'OverflowMenu'],
} satisfies ComponentMeta
