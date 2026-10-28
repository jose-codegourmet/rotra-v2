import type { ComponentMeta } from '@rotra/ui/meta'

export const recordFinancialsTabMeta = {
  name: 'RecordFinancialsTab',
  description:
    'Financials tab of the session record: empty until Q10.8 adds the saved cost estimate and the payments checklist.',
  usage: [
    'Rendered inside SessionRecord\'s "Financials" TabsContent with { sessionId, record: SessionRecordSummary }; no visual markup of its own beyond @rotra/ui components.',
    'Q10.8 fills this file only; SessionRecord does not change.',
  ],
  docs: ['docs/screens/product/modules/queue/results-sharing.md#q-history--session-record'],
  related: ['SessionRecord', 'SessionRecordHeader'],
} satisfies ComponentMeta
