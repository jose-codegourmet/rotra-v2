import type { ComponentMeta } from '@rotra/ui/meta'

export const moreOptionsSheetMeta = {
  name: 'MoreOptionsSheet',
  description: 'The preparation header actions collected into a phone sheet.',
  usage: [
    'Pass the actions available for the session state in prototype order.',
    'Danger actions close this sheet and open their usual confirmation.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Session preparation and session settings › More options',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['PageHeader', 'Sheet', 'Button'],
} satisfies ComponentMeta
