import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionLinkCardMeta = {
  name: 'SessionLinkCard',
  description:
    'The "Session link" box for a prepared or live Queue Session: the help line, a read-only link with Copy link, Open as a guest and Preview public page, and a "N join requests" chip while guests wait. The join switches moved to WhoCanJoinCard (two boxes side by side, stacked on phones).',
  usage: [
    'Use on the Settings tab and on Preparation › Overview, beside WhoCanJoinCard in a two-column grid that stacks on phones.',
    'The container owns the copy toast ("Session link copied") and the guest/public navigation; the card only reports through its callbacks.',
    'Waiting requests themselves live in JoinRequestsPanel, not here.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › Overview › linkCard() (#session-link)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/business_logic/product/queue/modules/players/README.md',
  ],
  related: ['WhoCanJoinCard', 'JoinRequestsPanel', 'TextInput', 'Chip'],
} satisfies ComponentMeta
