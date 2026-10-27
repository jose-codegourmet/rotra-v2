import type { ComponentMeta } from '@rotra/ui/meta'

export const recordResultsTabMeta = {
  name: 'RecordResultsTab',
  description: 'Results tab of the session record: InvalidSessionNotice (results variant, with the stored invalidReason) on an invalid session; the valid standings table, Result slides and Download images are added by Q08.6.',
  usage: [
    'Rendered inside SessionRecord\'s "Results" TabsContent with { sessionId, record: SessionRecordSummary }; no visual markup of its own beyond @rotra/ui components.',
    'Q08.6 fills the valid branch in this file only; SessionRecord does not change.',
  ],
  docs: ['docs/screens/product/modules/queue/results-sharing.md#q-history--session-record'],
  related: ['SessionRecord', 'InvalidSessionNotice'],
} satisfies ComponentMeta
