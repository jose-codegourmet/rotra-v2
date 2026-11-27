import type { ComponentMeta } from '@rotra/ui/meta'

export const playerPoolToolbarMeta = {
  name: 'PlayerPoolToolbar',
  description:
    'The Players view filter and sort: Available · N (present and off court, the default), In queue · N (free players in a waiting match), Playing · N (on a court), Present · N, Not here · N (away), Waitlist · N (hides the sort select), Everyone · N, and the sort: on desktop the Sort players buttons at the right, Name · Games · Wait · Level (the active one shows its direction arrow; tapping it again flips it); at 760 px and narrower the Sort players dropdown with both directions of each.',
  usage: [
    'Use above the PlayerPoolCard grid in the live console (Q-POOL). The parent filters and sorts the roster; the toolbar only reports the chosen show and sort.',
    'Counts are live: available excludes players on court, queue counts free players in a waiting match, playing counts players on a court, present counts the Present switch, Not here counts away players, Waitlist counts the waitlist, everyone is the whole roster.',
    "sort is { key, dir }: dir 1 is the first direction (Name A–Z, Games fewest first, Wait longest first, Level high to low), -1 the other. The default is DEFAULT_PLAYER_POOL_SORT, Wait longest first. Games means the card's Total, played plus queued (owner, November 25, 2026).",
    'For the saved players directory use SavedPlayersFilterBar.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Players › playersPane() (.seg, #pl-sort)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-pool--players-view',
    'docs/mockup-changes/2026-11-25-queue-players-sort-presence-bulk.md',
  ],
  related: [
    'PlayerPoolCard',
    'SelectionBar',
    'SegmentedControl',
    'Select',
    'SavedPlayersFilterBar',
  ],
} satisfies ComponentMeta
