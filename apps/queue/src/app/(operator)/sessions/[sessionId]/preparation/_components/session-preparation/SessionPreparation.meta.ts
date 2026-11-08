import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionPreparationMeta = {
  name: 'SessionPreparation',
  description:
    "Q-PREPARE container: PageHeader with the public page icon and responsive preparation actions (DeleteSessionSheet on useDeleteSession), the JoinRequests card above the tabs while requests wait, the Overview tab (SessionSetupCard from estimateMinimum, DeviceDownloadCard on useDownloadSession, SessionLinkCard on useSetAcceptJoinRequests), StartSessionBar from startBlocker, StartSessionSheet on useStartSession, and the dock's Start session pill through useDockAction.",
  usage: [
    'Rendered by /sessions/[sessionId]/preparation; active sessions show read-only Session settings with the existing live sheets and Continue session dock action; finalized/invalid sessions go to the record and finalizing sessions to finishing, unknown ids to notFound().',
    'Active sessions reuse CourtsAndTime, AddPlayer, JoinRequests and PaymentsPanel in sheets. Start, delete, edit and pre-start download controls are absent; fixed minimum copy uses the stored target.',
    'The Roster and levels (chip N/capacity) and Waitlist (chip N) tabs render PreparationRoster; the start bar and dock pill follow the roster query, so a level set there clears the blocker live. Payments arrives with Queue › Financials.',
    'The session link is window.location.origin + /s/<publicSlug>: Copy link writes it to the clipboard and toasts "Session link copied"; Open as a guest pushes the public page /s/<publicSlug>; Open public page (title icon) and Preview public page (Session link card) pushes the operator preview /sessions/[sessionId]/public-page. Turning Accept join requests off only flips the switch text; the card and the Join requests card stay.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-setup.md',
    'docs/business_logic/product/queue/modules/players/README.md#join-requests-from-the-session-link',
  ],
  related: [
    'PreparationRoster',
    'CourtsAndTime',
    'AddPlayer',
    'PaymentsPanel',
    'JoinRequests',
    'SessionLinkCard',
    'SessionSetupCard',
    'DeviceDownloadCard',
    'StartSessionBar',
    'StartSessionSheet',
    'FacebookPost',
    'DeleteSessionSheet',
  ],
} satisfies ComponentMeta
