import type { ComponentMeta } from '@rotra/ui/meta'

export const recordTabHeaderMeta = {
  name: 'RecordTabHeader',
  description:
    'Heading row of a session record tab panel: an h2 title with optional muted copy, and muted text or small actions on the right.',
  usage: [
    'Use at the top of the Results ("Standings" with Result slides and Download images), How the night ran (with its explainer copy) and Players ("Minimum N games · M below it") tabs of a Queue session record (Q-HISTORY).',
    'The record tabs sit under the page h1 in SessionRecordHeader, so the title is an h2.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-HISTORY › histResultsPane(), histNightPane(), histPlayersPane() (.between h2)',
  },
  docs: ['docs/screens/product/modules/queue/results-sharing.md#q-history--session-record'],
  variants: ['with actions', 'with aside', 'with description'],
  related: ['SessionRecordHeader', 'Tabs', 'PageHeader'],
} satisfies ComponentMeta
