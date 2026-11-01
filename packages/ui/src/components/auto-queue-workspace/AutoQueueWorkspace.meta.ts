import type { ComponentMeta } from '@rotra/ui/meta'

export const autoQueueWorkspaceMeta = {
  name: 'AutoQueueWorkspace',
  description:
    'The Main Queue and Auto Queue switch, five generation tabs and draft review actions in Q-QUEUE and Q-AUTO.',
  usage: [
    'Use inside the Queue view; pass the existing Main Queue as mainQueue.',
    'The container owns batches, cross-tab selection order, generation, clearing and transfer validation. The UI never appends a draft itself.',
    'Pass minimumGames for the Catch Up example and placeholder, and hasEligiblePlayers for the current strategy. The target is always an explicit choice; its placeholder never supplies a default.',
    'Disabled actions have visible, accessible explanations; generation results distinguish full batches, short batches, target met and remaining games in the plan.',
    'Main Queue regeneration stays in the supplied Main Queue content; the Auto Queue controls only affect drafts.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-QUEUE / Q-AUTO › Auto Queue workspace',
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
  ],
  related: ['AutoQueueSheet', 'RegenerateQueueSheet', 'Tabs', 'Checkbox'],
} satisfies ComponentMeta
