import type { ComponentMeta } from '@rotra/ui/meta'
export const dropOutNoticeRowMeta = {
  name: 'DropOutNoticeRow',
  description: 'A player who says they cannot make it, with Remove from roster and Keep actions.',
  usage: [
    'Pass the formatted notice time and callbacks; the caller owns the roster and notice mutations.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Requests › Join › dropOutRow()',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['Avatar', 'Button', 'JoinRequestsPanel'],
} satisfies ComponentMeta
