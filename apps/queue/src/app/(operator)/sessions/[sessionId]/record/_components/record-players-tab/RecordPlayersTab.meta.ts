import type { ComponentMeta } from '@rotra/ui/meta'

export const recordPlayersTabMeta = {
  name: 'RecordPlayersTab',
  description:
    'Players tab of the session record: empty until Q08.6 adds a card per roster player (Not counted on invalid sessions).',
  usage: [
    'Rendered inside SessionRecord\'s "Players" TabsContent with { sessionId, record: SessionRecordSummary }; no visual markup of its own beyond @rotra/ui components.',
    'Q08.6 fills this file only; SessionRecord does not change.',
  ],
  docs: ['docs/screens/product/modules/queue/results-sharing.md#q-history--session-record'],
  related: ['SessionRecord', 'SessionRecordHeader'],
} satisfies ComponentMeta
