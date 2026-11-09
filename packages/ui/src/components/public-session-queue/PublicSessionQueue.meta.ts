import type { ComponentMeta } from '@rotra/ui/meta'
export const publicSessionQueueMeta = {
  name: 'PublicSessionQueue',
  description:
    'Read-only waiting queue for authenticated Players on the public session Details tab: #1 pinned with a Next chip, #2 onward in a fading scroll box, each match one row.',
  usage: [
    'Pass only the narrow authenticated Player projection; no club account data.',
    'Loading, signed-out, failed and empty states keep access distinct from admission.',
  ],
  prototype: { file: 'apps/mockup/queue-app/rotra-queue.html', screen: 'Q-PUBLIC-DETAILS › Queue' },
  docs: ['docs/screens/product/modules/queue/public-session.md'],
  related: ['Avatar', 'Chip', 'PublicParticipants'],
} satisfies ComponentMeta
