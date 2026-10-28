import type { ComponentMeta } from '@rotra/ui/meta'

export const regenerateQueueMeta = {
  name: 'RegenerateQueue',
  description:
    'The Regenerate waiting queue? sheet container (Q-REGENERATE, D-REGENERATE): RegenerateQueueSheet with the counts from regenerateScope over useQueueSession, useSessionRoster and useSessionMatches, confirmed with useRegenerateQueue.',
  usage: [
    'Mounted once by SessionConsole and opened by Regenerate in the Queue view (primary while anything needs attention, disabled when the queue is empty). The counts are live: automatic waiting matches rebuilt, healthy manual matches kept, manual matches needing attention rebuilt, games in play untouched.',
    'Regenerate waiting queue is disabled when nothing would be rebuilt (no automatic match and no manual match needing attention). Keep current queue closes without a change. Rebuilt matches take the queue slots of the ones they replace; active matches are never touched.',
    'Confirm toasts the mutation message ("Queue regenerated · N rebuilt", with " · Saved on this device, waiting to sync" offline) and closes. On any failure (generation refused because too few players are present or both formats are off, Next save fails, offline without a downloaded copy) the previous queue stays exactly as it was, the sheet closes and the reason is an error toast, as in the prototype.',
    'ConfirmSheet underneath disables the primary and the dismiss controls while the rebuild runs, so a second tap cannot regenerate twice.',
  ],
  docs: [
    'docs/screens/product/modules/queue/match-queue.md#q-regenerate--review-rebuild-scope',
    'docs/screens/product/dialogs.md#d-regenerate--rebuild-waiting-queue',
    'docs/business_logic/product/queue/modules/queueing/README.md#attention-and-regeneration',
    'docs/screens/product/state-matrix.md',
  ],
  related: [
    'RegenerateQueueSheet',
    'ConfirmSheet',
    'QueueView',
    'AutoQueue',
    'SuggestMatch',
    'SessionConsole',
  ],
} satisfies ComponentMeta
