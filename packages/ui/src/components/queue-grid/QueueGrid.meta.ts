import type { ComponentMeta } from '@rotra/ui/meta'

export const queueGridMeta = {
  name: 'QueueGrid',
  description:
    "The Main Queue's waiting list with a bar (N waiting, previous / next arrows in slide mode, the Slide / Grid view switch). Slide mode (default): one row in queue order, native CSS scroll snap per card, 450 px cards (86% of the width on phones), an edge fade only while more cards sit on that side. Grid mode: the snake grid with flow arrows, tiles of 450 px or more (2 columns at 1280 px, 1 at 1024 px and on phones). Reordered by dragging the ⠿ handle or with the arrow keys on it, with switch-sides dragging on every card.",
  usage: [
    'Search highlights matching players and dims other cards without modifying the queue.',
    "Use for the whole waiting queue on the Queue tab (Q-QUEUE). The Session view's first row is UpcomingQueueRow.",
    "mode ('slide' | 'grid') lets the parent own the view; left out, the choice is kept per device in localStorage (slide on the server and first paint). onModeChange reports a switch. columns only applies to grid mode. The scroll position survives updates; the scroller takes focus so the arrow keys scroll it.",
    'Generate drafts do not use this grid; they keep 230 px tiles.',
    'Give it the queue in order; it numbers positions from 1 and passes each card its flow arrow.',
    'onMove(matchId, toIndex) reports a drop or an arrow key on the handle; onSwapSides(matchId, from, to) reports a switch of sides. The container saves both (Q05.4).',
    'Do not use for active matches: they have no dragging, and a lineup change is a substitution.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Live console › Queue tab › queuePane() (.qgrid, queueCard() snake, moveTo()/endDrag())',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/screens/product/experience-contract.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  related: ['MatchCard', 'UpcomingQueueRow', 'QueueViewSwitch', 'SwapSidesArea', 'SwappablePlayer'],
} satisfies ComponentMeta
