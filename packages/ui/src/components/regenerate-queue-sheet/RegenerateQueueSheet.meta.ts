import type { ComponentMeta } from '@rotra/ui/meta'

export const regenerateQueueSheetMeta = {
  name: 'RegenerateQueueSheet',
  description:
    'D-REGENERATE on ConfirmSheet: how many automatic waiting matches and manual matches needing attention a rebuild replaces, how many healthy manual matches it keeps and that games in play are untouched, then Keep current queue or Regenerate waiting queue.',
  usage: [
    'Open it from Regenerate on the Queue tab. The container gets the counts from regenerateScope and runs useRegenerateQueue on confirm; on success it closes with the toast "Queue regenerated · N rebuilt".',
    'The primary is disabled when nothing would be rebuilt; the Queue tab also disables Regenerate when the queue is empty.',
    'Pass the failure reason as error: the previous queue was restored and nothing is claimed as rebuilt.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-REGENERATE › SHEETS.regen',
  },
  docs: [
    'docs/screens/product/dialogs.md',
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  related: ['ConfirmSheet', 'AutoQueueSheet', 'MatchCard'],
} satisfies ComponentMeta
