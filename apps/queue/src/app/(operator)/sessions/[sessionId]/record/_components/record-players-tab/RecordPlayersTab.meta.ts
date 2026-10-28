import type { ComponentMeta } from '@rotra/ui/meta'

export const recordPlayersTabMeta = {
  name: 'RecordPlayersTab',
  description:
    'Players tab of the session record: RecordTabHeader "Players" with "Minimum N games · M below it" ("Not counted" on an invalid session) and a RecordPlayerCard per roster player, most games first then by name, with the rank from the standings.',
  usage: [
    'Rendered inside SessionRecord\'s "Players" TabsContent with { sessionId, record: SessionRecordSummary }; the cards come from record.playerSummaries and the ranks from useLiveStandings.',
    'An invalid session renders every card in the not-counted variant with no rank.',
    'A player picture opens the Q03 player profile dialog (PlayerProfile) with footer Close.',
  ],
  docs: ['docs/screens/product/modules/queue/results-sharing.md#q-history--session-record'],
  related: ['SessionRecord', 'RecordPlayerCard', 'RecordTabHeader', 'PlayerProfile'],
} satisfies ComponentMeta
