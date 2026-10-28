import type { ComponentMeta } from '@rotra/ui/meta'

export const recordNightTabMeta = {
  name: 'RecordNightTab',
  description:
    'How the night ran tab of the session record: InvalidSessionNotice (night variant) on an invalid session; the replay card and per-court match history are added by Q08.6.',
  usage: [
    'Rendered inside SessionRecord\'s "How the night ran" TabsContent with { sessionId, record: SessionRecordSummary }; no visual markup of its own beyond @rotra/ui components.',
    'Q08.6 fills the valid branch in this file only; SessionRecord does not change.',
  ],
  docs: ['docs/screens/product/modules/queue/results-sharing.md#q-history--session-record'],
  related: ['SessionRecord', 'InvalidSessionNotice'],
} satisfies ComponentMeta
