import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionSetupCardMeta = {
  name: 'SessionSetupCard',
  description:
    'Preparation › Overview › Setup card: courts, formats, mode with its description, Record games (On, or Off · no results kept), the minimum with its calculation or "Set by you", the roster count, and optional extra rows (Costs).',
  usage: [
    'scoringLabel is the Scoring row (SCORING[key].label from @rotra/schema/scoring); omitted reads as 16/31. With fixedAfterStart it adds “Fixed after start”.',
    'Pass requestFormatLabels to show the Requests row, including an empty array when no formats are allowed.',
    'recordGames defaults to on; pass false for a session that keeps no results. With fixedAfterStart the row adds "Fixed after start".',
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
