import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionSetupCardMeta = {
  name: 'SessionSetupCard',
  description:
    'Preparation › Overview › Setup card: courts, formats, mode with its description, the minimum with its calculation or "Set by you", the roster count, and optional extra rows (Costs).',
  usage: [
    "The container builds the minimum line from estimateMinimum() in @rotra/data and the session's minimumIsCalculated flag.",
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › prepOverview() Setup card',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['DeviceDownloadCard', 'StartSessionBar', 'KeyValueList'],
} satisfies ComponentMeta
