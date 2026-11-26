import type { ComponentMeta } from '@rotra/ui/meta'

export const whoCanJoinCardMeta = {
  name: 'WhoCanJoinCard',
  description:
    'The "Who can join" box next to Session link: "How people get a slot from the session link.", the Accept join requests switch and the Always require a request switch with their lines (D-2026-11-12-02).',
  usage: [
    'Put it beside SessionLinkCard in a two-column grid (stacked on phones), on the Settings tab and on Q-PREPARE.',
    'The container owns the useSetAcceptJoinRequests and useSetAlwaysRequireRequest mutations and their toasts; the card only reports through its callbacks.',
    'Always require a request is disabled and reads off while Accept join requests is off.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › Overview and Q-CONSOLE › Settings › linkCard()',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['SessionLinkCard', 'Switch', 'Card'],
} satisfies ComponentMeta
