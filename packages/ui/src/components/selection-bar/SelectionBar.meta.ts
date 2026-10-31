import type { ComponentMeta } from '@rotra/ui/meta'

export const selectionBarMeta = {
  name: 'SelectionBar',
  description:
    'The bar that turns picked players into a match: stacked faces, "N selected · FORMAT" or the reason the pick cannot become a match, Clear, and the primary Make match.',
  usage: [
    'Render it under the PlayerPoolCard grid only while at least one player is picked (Q-POOL).',
    'The parent decides the label and validity from the pick count and the session formats (2 singles, 3 1v2, 4 doubles, 6 3v3, 8 4v4, 10 5v5; singles or doubles may be off). Fun formats add ", counts toward session games only".',
    'Make match stays disabled until the pick is valid and is hidden when onMakeMatch is not given.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Live console › Players › playersPane() (.selbar), matchPlan()',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-pool--players-view',
    'docs/business_logic/product/queue/modules/queueing/README.md#make-match',
  ],
  related: ['PlayerPoolCard', 'PlayerPoolToolbar', 'Avatar', 'Button'],
} satisfies ComponentMeta
