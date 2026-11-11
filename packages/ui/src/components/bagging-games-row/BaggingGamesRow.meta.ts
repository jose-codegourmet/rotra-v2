import type { ComponentMeta } from '@rotra/ui/meta'

export const baggingGamesRowMeta = {
  name: 'BaggingGamesRow',
  description:
    'The games a bagging pair plays together: ALL, then one button per game number up to the session minimum (#739).',
  usage: [
    'Use on each row of the Bagging pairs card and in the Add bagging pair sheet (D-BAGGING-PAIR).',
    'Report taps through onToggle and apply toggleBaggingGame from @rotra/data: every number or none falls back to ALL.',
    'Not a SegmentedControl: several game numbers can be on at once.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Queue tab › Generate matches › Bagging pairs › Games row',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  related: ['BaggingPairsCard', 'BaggingPairSheet', 'SegmentedControl'],
} satisfies ComponentMeta
