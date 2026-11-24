import type { ComponentMeta } from '@rotra/ui/meta'

export const autoQueueWorkspaceMeta = {
  name: 'AutoQueueWorkspace',
  description:
    'The Generate Queue tab (Q-AUTO): the Generate Queue heading, the Bagging mode switch, five generation tabs and draft review actions.',
  usage: [
    'The console renders it as its own Generate Queue tab, next to the Main Queue tab; the Main Queue is not part of this component. Adding reviewed drafts calls onAddToMainQueue and the container then returns to the Main Queue tab.',
    'The container owns batches, cross-tab selection order, generation, clearing and transfer validation. The UI never appends a draft itself.',
    'Pass minimumGames for the Catch Up example and placeholder, and hasEligiblePlayers for the current strategy. The target is always an explicit choice; its placeholder never supplies a default.',
    'Disabled actions have visible, accessible explanations; generation results distinguish full batches, short batches, target met and remaining games in the plan.',
    'Main Queue regeneration stays in the Main Queue tab; the Generate controls only affect drafts.',
    'Drafts render as MatchCard draft tiles in the queue grid; picking a tile calls onSelect, and the SelectionBar Clear calls onUnselectAll. One primary at a time: Generate (then Generate again) in the controls, Add N to Main Queue in the bar; the other draft actions are in an OverflowMenu.',
    'Bagging mode (#739): pass `bagging` on doubles sessions for the header switch, the Bagging pairs card while on, and the Add bagging pair sheet; leave it out when the session has no doubles. A draft a pair shaped carries the reason "Bagging pair: A and B are partners".',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-AUTO › Generate Queue tab',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  variants: [
    'empty',
    'generated',
    'loading',
    'pending',
    'stale',
    'conflict',
    'catch-up',
    'invalid-target',
    'no-eligible-players',
    'short-batch',
    'target-met',
    'shortfall',
    'bagging-off',
    'bagging-on',
    'bagging-hidden',
  ],
  related: [
    'AutoQueueSheet',
    'RegenerateQueueSheet',
    'BaggingPairsCard',
    'BaggingPairSheet',
    'Tabs',
    'Checkbox',
  ],
} satisfies ComponentMeta
