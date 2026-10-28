import type { ComponentMeta } from '@rotra/ui/meta'

export const recordNightTabMeta = {
  name: 'RecordNightTab',
  description:
    'How the night ran tab of the session record: RecordTabHeader with the explainer copy, the ReplayCard and RecordCourtColumns (one column per court of MatchRecordCards in start order, "N matches" / "No matches."), all from useSessionRecordHistory. An invalid session shows InvalidSessionNotice (night variant).',
  usage: [
    'Rendered inside SessionRecord\'s "How the night ran" TabsContent with { sessionId, record: SessionRecordSummary }.',
    'Replay state is local: Play advances one session minute every 120 ms (a three-hour night in about 20 seconds) and stops at the last match end; Play at the end starts again from the first match. Scrubbing pauses and moves the moment. The matches on court at that moment are highlighted in the columns. Switching tabs unmounts the panel, which stops playback.',
    'Invalid matches stay in their court column with the Invalid chip; substitution notes read "N substitutions; partial games not counted". A 5v5 is listed under its first court and drawn on both courts in the replay.',
    'Every player picture (replay courts and match cards) opens the Q03 player profile dialog with footer Close.',
  ],
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-history--session-record',
    'docs/screens/product/modules/queue/match-control.md#q-match-record--read-only-outcome',
  ],
  related: [
    'SessionRecord',
    'ReplayCard',
    'RecordCourtColumns',
    'MatchRecordCard',
    'RecordTabHeader',
    'PlayerProfile',
    'InvalidSessionNotice',
  ],
} satisfies ComponentMeta
