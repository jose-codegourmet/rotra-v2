import type { ComponentMeta } from '@rotra/ui/meta'

export const notRecordedNoticeMeta = {
  name: 'NotRecordedNotice',
  description:
    'The info notice a Queue Session with Record games off shows in its session record: no results, standings, result slides, awards, match history or replay, and no player-record or ranking contribution.',
  usage: [
    'variant="results" in the Results pane of the record, where it replaces the standings and the Result slides and Download images actions.',
    'variant="night" in the How the night ran pane, where it adds "There is no match history or replay."',
    'Show it only for an unrecorded session; an invalid session uses InvalidSessionNotice.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-HISTORY › histResultsPane / histNightPane › NOT_RECORDED',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-history--session-record',
    'docs/mockup-changes/2026-11-18-queue-record-games-option.md',
  ],
  variants: ['results', 'night'],
  related: ['Notice', 'InvalidSessionNotice', 'NotRecordedChip'],
} satisfies ComponentMeta
