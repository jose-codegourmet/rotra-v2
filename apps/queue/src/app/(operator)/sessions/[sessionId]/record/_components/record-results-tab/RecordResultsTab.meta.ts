import type { ComponentMeta } from '@rotra/ui/meta'

export const recordResultsTabMeta = {
  name: 'RecordResultsTab',
  description:
    'Results tab of the session record: RecordTabHeader "Standings" with Result slides (→ /sessions/[sessionId]/results) and Download images (ExportImagesSheetContainer), then the LiveLeaderboard record variant (#, Player, W, L, Games) from useLiveStandings. An invalid session shows only InvalidSessionNotice (results variant, with the stored reason).',
  usage: [
    'Rendered inside SessionRecord\'s "Results" TabsContent with { sessionId, record: SessionRecordSummary }.',
    'Share leaderboard (2026-11-13-share-leaderboard) opens ShareDialog with LeaderboardShareCard: the official standings with the saved players’ pictures, no viewer row, and the visitor Session link.',
    'With no counted games the table reads "No counted games were recorded in this session." (LiveLeaderboard record variant). Never zero-filled.',
    'A player picture opens the Q03 player profile dialog (PlayerProfile) with footer Close.',
    'SessionPodium (D-2026-11-25-04) sits between the Standings heading row and the table, always shown (empty steps with no counted games); a shared place opens Podium place, and a row there opens the profile with Back to place.',
  ],
  docs: ['docs/screens/product/modules/queue/results-sharing.md#q-history--session-record'],
  related: [
    'SessionRecord',
    'LiveLeaderboard',
    'SessionPodium',
    'RecordTabHeader',
    'ExportImagesSheetContainer',
    'PlayerProfile',
    'InvalidSessionNotice',
  ],
} satisfies ComponentMeta
