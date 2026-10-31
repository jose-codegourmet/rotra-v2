import type { ComponentMeta } from '@rotra/ui/meta'

export const emptyStateMeta = {
  name: 'EmptyState',
  description:
    'Explains that a list or view has nothing yet, why, and offers at most one next action the viewer is allowed to take.',
  usage: [
    'Write what is missing and when it will appear; never show fake rows.',
    'Offer only an action this audience may take (public viewers get none that edit).',
    'For a failed load use ErrorState; for a search with no hits say what was searched.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'Clubs › "No clubs match." (.empty); rotra-player.html › leaderboard empty',
  },
  docs: [
    'docs/screens/product/experience-contract.md#standard-states',
    'docs/screens/product/state-matrix.md',
  ],
  related: ['ErrorState', 'Skeleton'],
} satisfies ComponentMeta
