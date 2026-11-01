import type { ComponentMeta } from '@rotra/ui/meta'
export const autoQueueMeta = {
  name: 'AutoQueue',
  description: 'Q-AUTO draft workspace on in-memory generation, selection and atomic transfer hooks. No match count is preselected.',
  usage: ['Mounted by QueueView around its Main Queue content.', 'Five alternative batches retain cross-tab selection order. Only explicit transfer creates accepted matches.', 'Failed transfers keep the review open with its order, lineups and retry confirmation. Drafts reset on reload.'],
  docs: ['docs/screens/product/modules/queue/match-queue.md', 'docs/business_logic/product/queue/modules/queueing/README.md'],
  related: ['AutoQueueWorkspace', 'QueueView', 'RegenerateQueue'],
} satisfies ComponentMeta
