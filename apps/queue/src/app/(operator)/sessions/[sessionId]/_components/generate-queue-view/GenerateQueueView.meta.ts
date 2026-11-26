import type { ComponentMeta } from '@rotra/ui/meta'

export const generateQueueViewMeta = {
  name: 'GenerateQueueView',
  description:
    'Q-AUTO container, the console\'s Generate Queue tab: the "Generate Queue" heading, the Bagging mode switch, the five generation tabs and the draft review actions, through AutoQueue. The tab has no count chip.',
  usage: [
    'Listed in SessionConsole\'s VIEWS registry under the Generate queue tab (?tab=generate). The Main Queue tab\'s "Generate Queue" button opens it.',
    'Adding reviewed drafts to the Main Queue toasts the result and returns the console to the Main Queue tab (onOpenQueue). The tab stays mounted while hidden, so the chosen strategy and count survive a visit to another tab.',
  ],
  docs: [
    'docs/screens/product/modules/queue/match-queue.md#q-auto--generate-matches-workspace',
    'docs/screens/product/modules/queue/session-console.md#q-console--operator-workspace',
  ],
  related: ['SessionConsole', 'AutoQueue', 'QueueView', 'AutoQueueWorkspace'],
} satisfies ComponentMeta
