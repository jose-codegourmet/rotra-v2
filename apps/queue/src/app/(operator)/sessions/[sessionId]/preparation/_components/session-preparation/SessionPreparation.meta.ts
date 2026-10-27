import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionPreparationMeta = {
  name: 'SessionPreparation',
  description:
    "Q-PREPARE container: PageHeader with Edit preparation / Preview public page / Copy Facebook post, the Overview tab (SessionSetupCard from estimateMinimum, DeviceDownloadCard on useDownloadSession), StartSessionBar from startBlocker, StartSessionSheet on useStartSession, and the dock's Start session pill through useDockAction.",
  usage: [
    'Rendered by /sessions/[sessionId]/preparation; active sessions go to the console, finished ones to the record, unknown ids to notFound().',
    'The Roster and levels (chip N/capacity) and Waitlist (chip N) tabs render PreparationRoster; the start bar and dock pill follow the roster query, so a level set there clears the blocker live. Session link content arrives with Q03.7; Payments with Queue › Financials.',
  ],
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: [
    'PreparationRoster',
    'SessionSetupCard',
    'DeviceDownloadCard',
    'StartSessionBar',
    'StartSessionSheet',
    'FacebookPost',
  ],
} satisfies ComponentMeta
