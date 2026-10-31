import type { ComponentMeta } from '@rotra/ui/meta'

export const errorStateMeta = {
  name: 'ErrorState',
  description:
    'Shown when data fails to load: a retryable failure with Try again, or a permission/license denial that explains access without showing private data.',
  usage: [
    'kind="retryable" maps from the retryable and offline MockError kinds; pass onRetry (usually the query refetch) and retrying while it runs.',
    'kind="permission" for permission or license denial: no Retry, and never render partial private content behind it.',
    'Keep whatever the user typed; an error state never clears a form.',
  ],
  prototype: {
    file: 'app/mocksups-app/player-app/rotra-player.html',
    screen: 'Leaderboard › "Couldn\'t load the leaderboard." + Try again',
  },
  docs: [
    'docs/screens/product/experience-contract.md#standard-states',
    'docs/screens/product/state-matrix.md',
  ],
  variants: ['retryable', 'permission'],
  related: ['Notice', 'EmptyState'],
} satisfies ComponentMeta
