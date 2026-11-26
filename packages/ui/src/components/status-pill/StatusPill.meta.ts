import type { ComponentMeta } from '@rotra/ui/meta'

export const statusPillMeta = {
  name: 'StatusPill',
  description:
    'A player\'s live status as an icon plus only the time (owner, November 26, 2026): hourglass "2m" (free, waiting), list "2m" (in queue), shuttlecock "1m" (playing), clock "Ready" (getting ready on a court) or moon "Away" (muted, dashed border). The full words are the hover title and the accessible name.',
  usage: [
    'Used on PlayerPoolCard (size md) and under each Main Queue face through PlayerFaceButton (size sm); StatusLegend draws each icon alone (iconOnly).',
    'Times use shortTime() from @rotra/schema/queue-time: "2m", "1h 5m", "1h", "1d+".',
    'Wait and In queue are warning from 10 minutes and error from 16; Playing and Getting ready are accent. The pill always carries the time or word beside the icon, so colour is never the only signal.',
    'Accessible names (role="img") and titles: "Free · waiting 2m since their last game", "In queue · waiting 2m since their last game", "Playing on Court 1 for 3m", "Getting ready on Court 1", "Away · not here".',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'ST_ICO, stPill() and statusPill() (.spill) on .pc3 cards and .qfaces',
  },
  docs: [
    'docs/mockup-changes/2026-11-25-queue-status-pills.md',
    'docs/mockup-changes/2026-11-26-queue-player-status-icons.md',
    'docs/screens/product/modules/queue/session-console.md#q-pool--players-view',
    'docs/screens/product/modules/queue/match-queue.md',
  ],
  variants: ['wait', 'queued', 'playing', 'ready', 'away'],
  related: ['Chip', 'Icon', 'StatusLegend', 'PlayerPoolCard', 'PlayerFaceButton', 'MatchCard'],
} satisfies ComponentMeta
