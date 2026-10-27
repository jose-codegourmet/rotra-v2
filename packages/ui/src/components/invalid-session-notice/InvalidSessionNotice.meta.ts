import type { ComponentMeta } from '@rotra/ui/meta'

export const invalidSessionNoticeMeta = {
  name: 'InvalidSessionNotice',
  description:
    'The error notice an invalid Queue Session shows in its session record: no official result, no player-record or ranking contribution, no standings, slides or match history.',
  usage: [
    'variant="results" in the Results pane of the record, with the session\'s invalidReason as reason.',
    'variant="night" in the How the night ran pane, where it replaces the match history and replay.',
    'Never pair it with Result slides, Publish, Download, Edit winners or Reconstruct results: invalidity is permanent.',
    'Games in the record show "—" and players show "Not counted"; this notice explains why.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'viewHistory › histResultsPane / histNightPane for the invalid Tuesday Drills record',
  },
  docs: [
    'docs/screens/product/modules/queue/session-finalization.md#q-invalid-session--no-official-result',
    'docs/business_logic/product/queue/modules/results/README.md#session-record',
  ],
  variants: ['results', 'night'],
  related: ['Notice', 'InvalidSessionConfirm'],
} satisfies ComponentMeta
