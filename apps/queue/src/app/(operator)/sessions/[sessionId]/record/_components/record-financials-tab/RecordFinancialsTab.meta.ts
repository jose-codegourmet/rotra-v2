import type { ComponentMeta } from '@rotra/ui/meta'

export const recordFinancialsTabMeta = {
  name: 'RecordFinancialsTab',
  description:
    'Financials tab of the session record: the saved cost estimate and manual payments checklist; invalid sessions have no checklist.',
  usage: [
    'Rendered inside SessionRecord\'s "Financials" TabsContent with { sessionId, record: SessionRecordSummary }; no visual markup of its own beyond @rotra/ui components.',
    'Displays an empty estimate card when none was saved. Financial values stay operator-only.',
  ],
  docs: ['docs/screens/product/modules/queue/results-sharing.md#q-history--session-record'],
  related: ['SessionRecord', 'SessionRecordHeader'],
} satisfies ComponentMeta
