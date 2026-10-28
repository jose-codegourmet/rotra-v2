import type { ComponentMeta } from '@rotra/ui/meta'

export const skeletonMeta = {
  name: 'Skeleton',
  description: 'A pulsing placeholder bar shown where content will appear while it loads.',
  usage: [
    'Pass label on the first bar to name a loading region without a separate wrapper.',
    'Shape skeletons like the real rows (an avatar circle, a name bar, a number bar); never show fake names, results or counts.',
    'Wrap them in a <section aria-busy="true" aria-label="Loading the leaderboard"> (or the region that is loading).',
    'The pulse stops under reduced motion.',
  ],
  prototype: {
    file: 'docs/frames/player-app/rotra-player.html',
    screen: 'Leaderboard › loading (.skel)',
  },
  docs: ['docs/screens/product/experience-contract.md#standard-states'],
  related: ['EmptyState', 'ErrorState', 'Spinner'],
} satisfies ComponentMeta
