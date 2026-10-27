import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionConsoleMeta = {
  name: 'SessionConsole',
  description:
    'Q-CONSOLE container, the live session shell: PageHeader with the "Live session" label, mode / formats / "Min N games" chips, "VENUE · Started HH:MM · Ends HH:MM" and the Home, Public page, Copy Facebook post, Extend time and "Join requests · N" actions; the Session / Queue / Players / Leaderboard tabs with live count chips from useQueueSession, useSessionRoster, useSessionMatches and useLiveStandings; the view panels; ConsoleFooterBar; and the dock\'s Session done pill through useDockAction.',
  usage: [
    'Rendered by /sessions/[sessionId]. A prepared session is sent to /preparation, a finalizing one to /finishing, a completed or invalid one to /record, an unknown or foreign id to notFound(); the left nav\'s Live session item and the dashboard\'s Continue session land here.',
    'The view is local state. Session renders SessionView; Queue, Players and Leaderboard come from the VIEWS registry, one container file each: list a container there and its tab and panel appear (Queue renders QueueView with the "N waiting" and warn "N need attention" chips, Players renders PlayersView and Leaderboard renders LeaderboardView).',
    'One sheet at a time: "Join requests" (JoinRequests in sheet variant, Done), Copy Facebook post (FacebookPost), and the adjust / add-court values that CourtsAndTime renders as the Courts and time sheet (Extend time) and the Add a court form (the + Add court tile, or "Add a court…" inside the first). Payments is rendered only once Queue › Financials provides its sheet.',
    'The Queue › Match editing sheets are the `matchSheet` state: Add match (the Queue header, a free court card) and Edit (queue cards in both the Session and Queue views) open MatchLineup, Suggest opens SuggestMatch and Auto queue opens AutoQueue; Edit then add in a suggestion reopens MatchLineup pre-filled, and Regenerate in the Queue view opens RegenerateQueue (D-REGENERATE). A saved lineup, an accepted suggestion or an auto queue run switches the console to the Queue tab; a regeneration stays on it.',
    'Session done in the footer bar and the dock pill open SessionDoneFlow (the three-step Session done sheet; Confirm Session done pushes /finishing) and are disabled offline: online comes from useSyncState (the mock follows the DevMenu\'s Simulate offline toggle), the footer shows "Connect to finish and sync this session." and the warn Notice "Working offline on this device. Matches, results and roster changes save here and sync when you reconnect. Session done needs internet." sits under the header. Every other console mutation still works; its toast ends in " · Saved on this device, waiting to sync".',
    'The 30-second refresh is the useNow clock (apps/queue/src/lib/useNow.ts) passed to every view as `now`: wait times, minutes in game and Booking ended move on each tick, which is skipped while a sheet is open, a field has focus or a pointer is held down (a card being dragged). Each tick also refetches the session, so one finalized or invalidated elsewhere redirects to its record route.',
    'Next save fails (DevMenu) rejects the write before any store change: the containers toast "Changes could not be saved" as an error and claim nothing, so the last durable state stays on screen. An expired license mid-session keeps this console usable (the mock allows writes to an active session); the operator shell gates every other nav item.',
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
    'MatchLineup',
    'SuggestMatch',
    'AutoQueue',
    'RegenerateQueue',
    'SessionDoneFlow',
    'PlayerProfile',
    'JoinRequests',
    'FacebookPost',
    'ConsoleFooterBar',
    'PageHeader',
    'Tabs',
    'SessionPreparation',
  ],
} satisfies ComponentMeta
