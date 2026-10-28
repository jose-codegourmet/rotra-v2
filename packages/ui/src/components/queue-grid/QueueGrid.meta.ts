import type { ComponentMeta } from '@rotra/ui/meta'

export const queueGridMeta = {
  name: 'QueueGrid',
  description:
    "The Queue tab's waiting list: MatchCards in 1–5 columns by width, ordered in a snake (left to right, then back right to left) with flow arrows, reordered by dragging the ⠿ handle or with the arrow keys on it, and with switch-sides dragging on every card.",
  usage: [
    "Use for the whole waiting queue on the Queue tab (Q-QUEUE). The Session view's first row is UpcomingQueueRow.",
    'Give it the queue in order; it numbers positions from 1 and passes each card its flow arrow.',
    'onMove(matchId, toIndex) reports a drop or an arrow key on the handle; onSwapSides(matchId, from, to) reports a switch of sides. The container saves both (Q05.4).',
    'Do not use for active matches: they have no dragging, and a lineup change is a substitution.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen:
      'Live console › Queue tab › queuePane() (.qgrid, queueCard() snake, moveTo()/endDrag())',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/screens/product/experience-contract.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  related: ['MatchCard', 'UpcomingQueueRow', 'SwapSidesArea', 'SwappablePlayer'],
} satisfies ComponentMeta
