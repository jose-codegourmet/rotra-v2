import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionLinkCardMeta = {
  name: 'SessionLinkCard',
  description:
    'The public session link for a prepared or live Queue Session: a read-only link with Copy link, Open as a guest and Preview public page, a "N join requests" chip while guests wait, and the Accept join requests switch.',
  usage: [
    'Use on Preparation › Overview, below the Setup and This device cards, for every prepared or live session.',
    'The container owns the copy toast ("Session link copied"), the guest/public navigation and the useSetAcceptJoinRequests mutation; the card only reports through its callbacks.',
    'Waiting requests themselves live in JoinRequestsPanel, not here.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › Overview › linkCard() (#session-link)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/business_logic/product/queue/modules/players/README.md',
  ],
  related: ['JoinRequestsPanel', 'Switch', 'TextInput', 'Chip'],
} satisfies ComponentMeta
