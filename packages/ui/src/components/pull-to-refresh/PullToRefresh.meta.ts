import type { ComponentMeta } from '@rotra/ui/meta'

export const pullToRefreshMeta = {
  name: 'PullToRefresh',
  description:
    'Wraps a page so pulling it down from the top refreshes its data: a pill slides from under the top bar ("Pull to refresh" → "Release to refresh" → "Refreshing…" → "Updated 7:42 PM"). Touch only; only data refreshes, never the page.',
  usage: [
    'Wrap the page content of a screen whose list changes while it is open: the public session page, the leaderboard, a club page, the own profile (My sessions), the Admin request inboxes (mockup change 2026-11-12).',
    'Pair it with useThrottledRefresh (or useRefreshSession) from @rotra/data: pass its refresh as onRefresh and !canRefresh as throttled, so the 10 second lock is shared with any Refresh button (D-2026-11-09-04).',
    'Pass offline while the viewer is offline and disabled while a sheet is open. Do not use it on the live console or on editing screens: the console has its own 30 second refresh and drag gestures, and forms hold drafts.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Public session page › #ptr (also rotra-player.html leaderboard, club page, own profile; rotra-admin.html Requests)',
  },
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/mockup-changes/2026-11-12-queue-pull-to-refresh.md',
  ],
  related: ['PublicRefreshBar', 'Spinner'],
} satisfies ComponentMeta
