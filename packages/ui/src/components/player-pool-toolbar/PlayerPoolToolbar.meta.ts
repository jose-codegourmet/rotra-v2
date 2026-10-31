import type { ComponentMeta } from '@rotra/ui/meta'

export const playerPoolToolbarMeta = {
  name: 'PlayerPoolToolbar',
  description:
    'The Players view filter and sort: Available · N (present and off court, the default), Present · N, Everyone · N, and the Sort players select (longest wait, least games, most games, level high to low).',
  usage: [
    'Use above the PlayerPoolCard grid in the live console (Q-POOL). The parent filters and sorts the roster; the toolbar only reports the chosen show and sort.',
    'Counts are live: available excludes players on court, present counts the Present switch, everyone is the whole roster.',
    'For the saved players directory use SavedPlayersFilterBar.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Live console › Players › playersPane() (.seg, #pl-sort)',
  },
  docs: ['docs/screens/product/modules/queue/session-console.md#q-pool--players-view'],
  related: [
    'PlayerPoolCard',
    'SelectionBar',
    'SegmentedControl',
    'Select',
    'SavedPlayersFilterBar',
  ],
} satisfies ComponentMeta
