import type { ComponentMeta } from '@rotra/ui/meta'

export const matchCardMeta = {
  name: 'MatchCard',
  description:
    'One waiting match in the shared queue: queue position, format, origin, flow arrow and drag handle; Team A, VS, Team B; a status line (ready, needs attention, blocked, waiting for courts) that is always icon + text; Start, Edit and Remove.',
  usage: [
    "Use for every waiting match in the Queue tab grid and in the Session view's upcoming row.",
    'Do not use for finished matches; the session record has its own row component in Queue › Results.',
    'Start renders only with onStart and is enabled only when the status is ready. Edit and Remove render only with their callbacks.',
    'The grid passes the flow arrow and the reorder behaviour passes handleProps; the card itself does not reorder.',
    'With swappable inside a SwapSidesArea, each player can be dragged onto the other team or moved across with the arrow keys; the area reports the swap.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-QUEUE › queueCard() (.qtile, .qt-head, .qfaces, .status-line)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  variants: ['ready', 'needs-attention', 'blocked', 'waiting-for-courts'],
  related: [
    'QueueGrid',
    'UpcomingQueueRow',
    'SwapSidesArea',
    'SwappablePlayer',
    'PlayerFaceButton',
    'CourtCard',
    'Chip',
  ],
} satisfies ComponentMeta
