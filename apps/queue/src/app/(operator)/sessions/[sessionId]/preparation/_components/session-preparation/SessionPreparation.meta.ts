import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionPreparationMeta = {
  name: 'SessionPreparation',
  description:
    'Q-PREPARE container: PageHeader with the public page icon and responsive preparation actions (DeleteSessionSheet on useDeleteSession), the JoinRequests card ("Requests · N", no tabs) above the tabs while a join request or drop-out notice waits, the Overview tab (SessionSetupCard from estimateMinimum, DeviceDownloadCard on useDownloadSession, SessionLinkCard on useSetAcceptJoinRequests and useSetAlwaysRequireRequest), StartSessionBar from startBlocker, StartSessionSheet on useStartSession, and the dock\'s Start session pill through useDockAction.',
  usage: [
    'Rendered by /sessions/[sessionId]/preparation; active sessions show read-only Session settings with the existing live sheets and Continue session dock action; finalized/invalid sessions go to the record and finalizing sessions to finishing, unknown ids to notFound().',
    'Active sessions reuse CourtsAndTime, AddPlayer, JoinRequests (the "Requests" sheet behind Match requests · N, match requests only) and PaymentsPanel in sheets. Start, delete, edit and pre-start download controls are absent; fixed minimum copy uses the stored target.',
    'The Roster and levels (chip N/capacity) and Waitlist (chip N) tabs render PreparationRoster; the start bar and dock pill follow the roster query, so a level set there clears the blocker live. Payments arrives with Queue › Financials.',
    'The session link is window.location.origin + /s/<publicSlug>: Copy link writes it to the clipboard and toasts "Session link copied"; Open as a guest pushes the public page /s/<publicSlug>; The title (SessionTitleLink) opens the operator preview /sessions/[sessionId]/public-page in a new tab; Preview public page (Session link card) pushes it. Turning Accept join requests off only flips the switch text; the card and the Requests card stay.',
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
