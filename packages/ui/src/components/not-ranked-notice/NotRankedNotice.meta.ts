import type { ComponentMeta } from '@rotra/ui/meta'

export const notRankedNoticeMeta = {
  name: 'NotRankedNotice',
  description:
    "The info notice a Queue Session with Record games off shows above its standings: its games and results are recorded as usual, but its wins don't count toward the ROTRA leaderboards or anyone's win rate.",
  usage: [
    'Above the standings in the Leaderboard tab of the live console and in the Results pane of the session record.',
    'Show it only for a session with Record games off; an invalid session uses InvalidSessionNotice.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-CONSOLE › Leaderboard tab; Q-HISTORY › histResultsPane › NOT_RANKED',
  },
  docs: [
    'docs/screens/product/modules/queue/results-sharing.md#q-history--session-record',
    'docs/mockup-changes/2026-11-20-queue-record-games-not-ranked.md',
  ],
  related: ['Notice', 'InvalidSessionNotice', 'NotRankedChip'],
} satisfies ComponentMeta
