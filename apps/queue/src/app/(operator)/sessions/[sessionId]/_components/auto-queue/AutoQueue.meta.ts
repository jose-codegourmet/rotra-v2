import type { ComponentMeta } from '@rotra/ui/meta'
export const autoQueueMeta = {
  name: 'AutoQueue',
  description:
    'Q-AUTO draft workspace on in-memory generation, selection and atomic transfer hooks. No match count is preselected.',
  usage: [
    "Mounted by GenerateQueueView, the console's Generate Queue tab. After reviewed drafts join the Main Queue it calls onAddedToMainQueue and the console returns to the Main Queue tab.",
    'Five alternative batches retain cross-tab selection order. Only explicit transfer creates accepted matches.',
    'Failed transfers keep the review open with its order, lineups and retry confirmation. Drafts reset on reload.',
    'Bagging mode (#739): on doubles sessions it passes the switch, the pairs list and the present players to the workspace; the switch and pairs live with the drafts (never saved) and guide Generate Queue only.',
  ],
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  related: [
    'AutoQueueWorkspace',
    'BaggingPairsCard',
    'BaggingPairSheet',
    'GenerateQueueView',
    'RegenerateQueue',
  ],
} satisfies ComponentMeta
