import type { ComponentMeta } from '@rotra/ui/meta'
export const matchRequestCardMeta = {
  name: 'MatchRequestCard',
  description:
    'A match request with one row per named or Anyone spot and Decline / Add to queue actions.',
  usage: [
    'Pass spots in requester, partner, opponent order with caller-formatted time and location. Anyone spots have no player.',
    'The caller owns matching, filling spots, mutation and errors.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Requests › Match › matchReqCard()',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['Avatar', 'Button', 'JoinRequestsPanel'],
} satisfies ComponentMeta
