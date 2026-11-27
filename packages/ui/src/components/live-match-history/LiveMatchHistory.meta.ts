import type { ComponentMeta } from '@rotra/ui/meta'

export const liveMatchHistoryMeta = {
  name: 'LiveMatchHistory',
  description:
    "The live console's Match History view: tonight's finished matches with the courts stacked as sections (\"Court 1 · 5 matches\"), the latest match on top of each court with a Latest chip, and each match's start time and length over an accent rule, then the shared match court card. A pill filter shows one court.",
  usage: [
    "Pass onOpenWinChance(matchId) to make each match's win chance and Upset pills open WinChanceDialog.",
    'Pass the session\'s finished matches (done and invalid) in any order; the component sorts each court newest first by start time. A match lists every court it used in courtIds and shows under each; the "All courts" pill counts it once.',
    'The filter is controlled: courtFilter is "all" or a court id, onCourtFilterChange receives the pick. The "N played" chip sits on the console tab, not in this view.',
    'Each card is the MatchCourt: "#N · start–end", faces with first names, score or "No score", winner ringed, Invalid desaturated, substitution lines under it. Faces call onOpenPlayer with the player id.',
    'Empty shows "No finished matches yet. They show here after Match done."; a court with no matches says so inside its section.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Q-CONSOLE › Match History › liveHistoryPane(), lhTimeline() (.lh-stack, .lh-court, .lh-time)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/mockup-changes/2026-11-19-queue-live-match-history.md',
    'docs/mockup-changes/2026-11-19-queue-match-history-timeline.md',
  ],
  variants: [
    'all courts',
    'one court',
    'empty',
    'a court with no matches',
    'invalid',
    '5v5 on two courts',
  ],
  related: ['MatchCourt', 'CountPills', 'RecordCourtColumns'],
} satisfies ComponentMeta
