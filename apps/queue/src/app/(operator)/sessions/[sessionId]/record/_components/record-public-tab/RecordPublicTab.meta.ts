import type { ComponentMeta } from '@rotra/ui/meta'

export const recordPublicTabMeta = {
  name: 'RecordPublicTab',
  description:
    'Public page tab of the session record: empty until Q09.6 adds what anyone with the link sees and the publish controls for valid sessions.',
  usage: [
    'Rendered inside SessionRecord\'s "Public page" TabsContent with { sessionId, record: SessionRecordSummary }; no visual markup of its own beyond @rotra/ui components.',
    'Q09.6 fills this file only; SessionRecord does not change. Invalid sessions never get Publish or Update publication.',
  ],
  docs: ['docs/screens/product/modules/queue/results-sharing.md#q-history--session-record'],
  related: ['SessionRecord', 'SessionRecordHeader'],
} satisfies ComponentMeta
