import type { ComponentMeta } from '@rotra/ui/meta'

export const recordCourtColumnsMeta = {
  name: 'RecordCourtColumns',
  description:
    'Every match of a session record by court: one column per court headed "Court N" and "N matches", listing MatchRecordCards in start order, or "No matches.". Columns stack on phones.',
  usage: [
    'Use under the ReplayCard in the How the night ran tab of a Queue session record (Q-HISTORY). The container passes matches already sorted by start time and marks the ones on court at the replay moment as highlighted.',
    'Invalid matches stay in their court column with the Invalid chip; substitutions read "N substitutions; partial games not counted" (MatchRecordCard).',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-HISTORY › histNightPane() (.hist-courts, .hist-col)',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-history--session-record',
    'docs/screens/product/modules/queue/match-control.md#q-match-record--read-only-outcome',
  ],
  variants: ['several courts', 'a court with no matches'],
  related: ['MatchRecordCard', 'ReplayCard'],
} satisfies ComponentMeta
