import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionSetupCardMeta = {
  name: 'SessionSetupCard',
  description:
    'Preparation › Overview › Setup card: courts, formats, mode with its description, the minimum with its calculation or "Set by you", the roster count, and optional extra rows (Costs).',
  usage: [
    'Pass requestFormatLabels to show the Requests row, including an empty array when no formats are allowed.',
    'Active Session settings passes fixedAfterStart and existing live actions; courtLabels include booking windows and the minimum describes the stored target.',
    "The container builds the minimum line from estimateMinimum() in @rotra/data and the session's minimumIsCalculated flag.",
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › prepOverview() Setup card',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['DeviceDownloadCard', 'StartSessionBar', 'KeyValueList'],
} satisfies ComponentMeta
