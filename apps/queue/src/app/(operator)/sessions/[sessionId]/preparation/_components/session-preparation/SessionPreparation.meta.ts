import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionPreparationMeta = {
  name: 'SessionPreparation',
  description:
    "Q-PREPARE container: PageHeader with Edit preparation / Preview public page / Copy Facebook post, the Overview tab (SessionSetupCard from estimateMinimum, DeviceDownloadCard on useDownloadSession), StartSessionBar from startBlocker, StartSessionSheet on useStartSession, and the dock's Start session pill through useDockAction.",
  usage: [
    'Rendered by /sessions/[sessionId]/preparation; active sessions go to the console, finished ones to the record, unknown ids to notFound().',
    'Roster, Waitlist and Session link content arrive with Queue › Players and roster; Payments with Queue › Financials.',
  ],
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: [
    'SessionSetupCard',
    'DeviceDownloadCard',
    'StartSessionBar',
    'StartSessionSheet',
    'FacebookPost',
  ],
} satisfies ComponentMeta
