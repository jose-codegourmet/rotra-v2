import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionRecordHeaderMeta = {
  name: 'SessionRecordHeader',
  description:
    'Header of the read-only session record: the "Session record · read-only" label, title, date · time · venue, the state chips and the four totals tiles (Games, Players, Courts, Length).',
  usage: [
    'Use once at the top of a completed or invalid session record, under the Breadcrumb; the tab bar follows it.',
    'A completed session shows Completed plus Results published / Results private; an invalid session shows only Invalid session and "—" for Games.',
    'Pass when and length already formatted; the component never formats dates itself.',
    'Do not use for the live console or the private results page (Session results · private).',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-HISTORY › viewHistory() (label, .row chips, .tiles4)',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-history--session-record',
    'docs/screens/product/modules/queue/session-finalization.md#q-invalid-session--no-official-result',
    'docs/business_logic/product/queue/modules/results/README.md#session-record',
  ],
  variants: ['completed', 'invalid'],
  related: ['Chip', 'Card', 'Breadcrumb', 'Tabs', 'PageHeader'],
} satisfies ComponentMeta
