import type { ComponentMeta } from '@rotra/ui/meta'
export const publicSessionQueueMeta = {
  name: 'PublicSessionQueue',
  description:
    'Read-only waiting queue for authenticated Players on the public session Details tab.',
  usage: [
    'Pass only the narrow authenticated Player projection; no club account data.',
    'Loading, signed-out, failed and empty states keep access distinct from admission.',
  ],
  prototype: { file: 'apps/mockup/queue-app/rotra-queue.html', screen: 'Q-PUBLIC-DETAILS › Queue' },
  docs: ['docs/screens/product/modules/queue/public-session.md'],
  related: ['MatchCard', 'PublicParticipants'],
} satisfies ComponentMeta
