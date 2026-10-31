import type { ComponentMeta } from '@rotra/ui/meta'

export const finalizeProgressMeta = {
  name: 'FinalizeProgress',
  description:
    'The Finishing TITLE panel shown while a Queue Session is finalized: four UI stages marked done, current or pending, and a polite live status line.',
  usage: [
    'The container supplies the stage labels in order: Checking session records, Finishing the session, Updating player records, Preparing result slides.',
    'Never show a percentage or a progress bar: the stages are not separate APIs and nothing measurable is in flight.',
    'Pass statusLine "Session finished; results are being prepared" when finalization committed but slides are still processing, and error with onRetry to retry only the failed work.',
    'The live region is aria-live="polite" and never takes focus. When everything is done the container opens the results view.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'viewFinalizing › Finishing TITLE',
  },
  docs: [
    'docs/screens/product/modules/queue/session-finalization.md#q-finalize-progress--finishing',
    'docs/business_logic/product/queue/modules/results/README.md#finalization-versus-publishing',
  ],
  related: ['Card', 'Notice', 'Spinner'],
} satisfies ComponentMeta
