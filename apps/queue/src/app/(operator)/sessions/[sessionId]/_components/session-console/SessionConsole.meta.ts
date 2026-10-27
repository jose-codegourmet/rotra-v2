import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionConsoleMeta = {
  name: 'SessionConsole',
  description:
    'Q-CONSOLE container, the live session shell: PageHeader with the "Live session" label, mode / formats / "Min N games" chips, "VENUE · Started HH:MM · Ends HH:MM" and the Home, Public page, Copy Facebook post, Extend time and "Join requests · N" actions; the Session / Queue / Players / Leaderboard tabs with live count chips from useQueueSession, useSessionRoster, useSessionMatches and useLiveStandings; the view panels; ConsoleFooterBar; and the dock\'s Session done pill through useDockAction.',
  usage: [
    'Rendered by /sessions/[sessionId]. A prepared session is sent to /preparation, a completed or invalid one to /record, an unknown or foreign id to notFound(); the left nav\'s Live session item and the dashboard\'s Continue session land here.',
    'The view is local state. Session renders SessionView; Queue, Players and Leaderboard come from the VIEWS registry, one container file each: list a container there and its tab and panel appear (the Queue tab stays hidden until Queue › Match queue lists it; Players renders PlayersView and Leaderboard renders LeaderboardView).',
    'One sheet at a time: "Join requests" (JoinRequests in sheet variant, Done), Copy Facebook post (FacebookPost), and the adjust / add-court values that CourtsAndTime renders as the Courts and time sheet (Extend time) and the Add a court form (the + Add court tile, or "Add a court…" inside the first). Payments is rendered only once Queue › Financials provides its sheet.',
    'Session done in the footer bar and the dock pill stay disabled until Queue › Session finalization wires the same handler to both; the footer bar\'s online flag follows the dev offline toggle. Offline, refresh and failure states arrive with Queue › Offline and recovery.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-console--operator-workspace',
    'docs/screens/product/modules/queue/access-home.md',
    'docs/business_logic/product/queue/modules/sessions/README.md#running',
    'docs/business_logic/product/queue/modules/queueing/README.md#shared-waiting-list',
  ],
  related: [
    'SessionView',
    'PlayersView',
    'LeaderboardView',
    'CourtsAndTime',
    'PlayerProfile',
    'JoinRequests',
    'FacebookPost',
    'ConsoleFooterBar',
    'PageHeader',
    'Tabs',
    'SessionPreparation',
  ],
} satisfies ComponentMeta
