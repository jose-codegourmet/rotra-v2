import type { ComponentMeta } from '@rotra/ui/meta'
export const publicSessionQueueMeta = {
  name: 'PublicSessionQueue',
  description:
    'Read-only waiting queue for authenticated Players on the public session Details tab: #1 pinned with a Next chip, #2 onward in a fading scroll box, each match one compact tile of overlapping level-ringed faces, VS and an eye button that opens the match.',
  usage: [
    'Pass only the narrow authenticated Player projection; no club account data.',
    'Loading, signed-out, failed and empty states keep access distinct from admission.',
    'Each tile shows no names: 34 px faces overlap per team (first in front), ringed by level (beginner blue, intermediate yellow, advanced red, grey when not assessed). Names live in each face\'s label and in the dialog.',
    'The eye button (View match) opens PublicQueueMatchDialog for that match; the title reads "Queue #N · <label>" from the match\'s `label`, or its format when none is given.',
  ],
  prototype: { file: 'apps/mockup/queue-app/rotra-queue.html', screen: 'Q-PUBLIC-DETAILS › Queue (.pqc)' },
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/mockup-changes/2026-11-19-queue-public-queue-compact.md',
    'docs/mockup-changes/2026-11-19-queue-public-skill-rings.md',
  ],
  related: ['Avatar', 'Chip', 'PublicParticipants', 'PublicQueueMatchDialog'],
} satisfies ComponentMeta
