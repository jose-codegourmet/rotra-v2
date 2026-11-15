import type { ComponentMeta } from '@rotra/ui/meta'

export const recordCourtColumnsMeta = {
  name: 'RecordCourtColumns',
  description:
    'Every match of a session record by court: one column per court headed "Court N" and "N matches", drawing each match on the shared MatchCourt in start order (the finished session page\'s Match history court), or "No matches.". Columns stack on phones.',
  usage: [
    'Use under the ReplayCard in the How the night ran tab of a Queue session record (Q-HISTORY). The container passes matches already sorted by start time and marks the ones on court at the replay moment as highlighted.',
    'Invalid matches stay in their court column, desaturated with the Invalid chip; the match on court at the replay moment glows (`now`). Substitution lines ("N substitutions; partial games not counted", one credit line each) sit under the court.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-HISTORY › histNightPane() (.hist-courts, .hist-col)',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-history--session-record',
    'docs/screens/product/modules/queue/match-control.md#q-match-record--read-only-outcome',
    'docs/mockup-changes/2026-11-15-queue-record-courts.md',
  ],
  variants: ['several courts', 'a court with no matches'],
  related: ['MatchCourt', 'MatchRecordCard', 'ReplayCard'],
} satisfies ComponentMeta
