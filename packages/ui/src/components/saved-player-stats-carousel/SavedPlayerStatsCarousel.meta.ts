import type { ComponentMeta } from '@rotra/ui/meta'

export const savedPlayerStatsCarouselMeta = {
  name: 'SavedPlayerStatsCarousel',
  description: 'Six club-wide Saved player statistics in an accessible swipeable Embla carousel.',
  usage: [
    'Place between the Saved players header and filters; pass unfiltered counts from @rotra/data.',
    'Omit stats for loading; render an error and retry in the container when the query fails.',
  ],
  prototype: { file: 'app/mocksups-app/queue-app/rotra-queue.html', screen: 'Saved players' },
  docs: ['docs/screens/product/modules/queue/players-roster.md'],
  variants: ['default', 'zero', 'loading'],
  related: ['SavedPlayersFilterBar', 'SavedPlayerCard'],
} satisfies ComponentMeta
