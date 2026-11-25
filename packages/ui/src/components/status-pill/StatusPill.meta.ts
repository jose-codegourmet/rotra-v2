import type { ComponentMeta } from '@rotra/ui/meta'

export const statusPillMeta = {
  name: 'StatusPill',
  description:
    'A player\'s live status as one short pill (owner, November 25, 2026): "Wait 2m" (free), "In queue 2m" (in a waiting match; still the wait since their last game), "Playing 1m" (since the match began; hover "Playing on Court 1"), "Getting ready" (on court, not started; hover names the court) or "Away" (muted, dashed border).',
  usage: [
    'Used on PlayerPoolCard (size md) and under each Main Queue face through PlayerFaceButton (size sm).',
    'Times use shortTime() from @rotra/schema/queue-time: "2m", "1h 5m", "1h", "1d+".',
    'Wait and In queue are warning from 10 minutes and error from 16; Playing and Getting ready are accent. The pill always says the time, so colour is never the only signal.',
    'Playing and Getting ready carry an accessible name with the court ("Playing on Court 1 for 3m"); the hover title says the same.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'statusPill() (.spill) on .pc3 cards and .qfaces',
  },
  docs: [
    'docs/mockup-changes/2026-11-25-queue-status-pills.md',
    'docs/screens/product/modules/queue/session-console.md#q-pool--players-view',
    'docs/screens/product/modules/queue/match-queue.md',
  ],
  variants: ['wait', 'queued', 'playing', 'ready', 'away'],
  related: ['Chip', 'PlayerPoolCard', 'PlayerFaceButton', 'MatchCard'],
} satisfies ComponentMeta
