import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionLinkCardMeta = {
  name: 'SessionLinkCard',
  description:
    'The public session link for a prepared or live Queue Session: a read-only link with Copy link, Open as a guest and Preview public page, a "N join requests" chip while guests wait, the Accept join requests switch and the Always require a request switch under it (D-2026-11-12-02).',
  usage: [
    'Use on Preparation › Overview, below the Setup and This device cards, for every prepared or live session.',
    'The container owns the copy toast ("Session link copied"), the guest/public navigation and the useSetAcceptJoinRequests and useSetAlwaysRequireRequest mutations; the card only reports through its callbacks.',
    'Always require a request (D-2026-11-12-02): off by default ("Club members join upcoming sessions right away; guests still send a request."), on makes members request too ("Club members send a join request too, like everyone else."). Pass alwaysRequireRequest and onAlwaysRequireRequestChange; the switch is disabled and reads off while acceptJoinRequests is false. Toasts: "Members must request now" / "Members can join right away".',
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
  related: ['JoinRequestsPanel', 'Switch', 'TextInput', 'Chip'],
} satisfies ComponentMeta
