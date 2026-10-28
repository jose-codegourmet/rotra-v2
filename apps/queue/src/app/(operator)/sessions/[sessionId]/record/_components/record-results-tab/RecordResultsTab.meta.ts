import type { ComponentMeta } from '@rotra/ui/meta'

export const recordResultsTabMeta = {
  name: 'RecordResultsTab',
  description:
    'Results tab of the session record: RecordTabHeader "Standings" with Result slides (→ /sessions/[sessionId]/results) and Download images (ExportImagesSheetContainer), then the LiveLeaderboard record variant (#, Player, W, L, Games) from useLiveStandings. An invalid session shows only InvalidSessionNotice (results variant, with the stored reason).',
  usage: [
    'Rendered inside SessionRecord\'s "Results" TabsContent with { sessionId, record: SessionRecordSummary }.',
    'With no counted games the table reads "No counted games were recorded in this session." (LiveLeaderboard record variant). Never zero-filled.',
    'A player picture opens the Q03 player profile dialog (PlayerProfile) with footer Close.',
  ],
  docs: ['docs/screens/product/modules/queue/results-sharing.md#q-history--session-record'],
  related: [
    'SessionRecord',
    'LiveLeaderboard',
    'RecordTabHeader',
    'ExportImagesSheetContainer',
    'PlayerProfile',
    'InvalidSessionNotice',
  ],
} satisfies ComponentMeta
