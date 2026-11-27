import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionConsoleMeta = {
  name: 'SessionConsole',
  description:
    'Q-CONSOLE container, the live session shell: PageHeader with the "Live session" label, mode / formats / "Min N games" chips, "VENUE · Started TIME · Ends TIME · N left" (or "Planned end passed N ago" in warning), the overdue banner (Set end time, Session done) and, at the upper right, ConsoleHeaderActions: "Match requests · N" (always shown, warn-coloured while N > 0; N = open match requests, from the live session read\'s requestCount in both modes), Courts and time, Payments and the ⋯ More for this session menu (Public page, Copy Facebook post, Home); the Courts / Main Queue / Generate Queue / Players / Leaderboard / Settings tabs (one "Console view" menu on phones) with live count chips from useQueueSession, useSessionRoster, useSessionMatches and useLiveStandings (Generate Queue and Settings have none); the view panels; ConsoleFooterBar; and the dock\'s Session done pill through useDockAction.',
  usage: [
    "Rendered by /sessions/[sessionId]. A prepared session is sent to /preparation, a finalizing one to /finishing, a completed or invalid one to /record, an unknown or foreign id to notFound(); the left nav's Live session item and the dashboard's Continue session land here.",
    'The view lives in the URL as ?tab=: none for Courts, then queue, generate, roster, board and settings (old session, players, leaderboard and payments values map to the nearest tab; payments lands on Settings). Leaderboard is hidden when Record games is off, and ?tab=board then shows Courts. Courts renders SessionView and Settings renders SettingsView (the session setup card, the session link card and All session settings, which opens the read-only /preparation page); Main Queue, Generate Queue, Players and Leaderboard come from the VIEWS registry, one container file each: list a container there and its tab and panel appear (Main Queue renders QueueView with the "N waiting" and warn "N need attention" chips and a Generate Queue button that opens the Generate Queue tab, Generate Queue renders GenerateQueueView and stays mounted while hidden, Players renders PlayersView and Leaderboard renders LeaderboardView).',
    'One sheet at a time: "Requests" (JoinRequests in sheet variant, match requests only, Done), "Payments" (PaymentsPanel as a sheet, Done; also the Payments button on the Settings tab), Copy Facebook post (FacebookPost), and the adjust / add-court values that CourtsAndTime renders as the Courts and time sheet and the Add a court form (the + Add court tile, or "Add a court…" inside the first).',
    'The Queue › Match editing sheets are the `matchSheet` state: Add match (the Queue header, a free court card) and Edit (queue cards in both the Courts and Main Queue tabs) open MatchLineup, Suggest opens SuggestMatch, and a free court\'s picture opens Court N is free (FreeCourtSheet: Pick from the queue opens Put a match on Court N, Generate a match opens the Suggested match). Stacked dialogs go back one level: the console keeps the dialogs a sheet was opened from (Court N is free › Put a match on Court N › Edit lineup, Court N is free › Suggested match), so ×, Escape, the scrim and Back return to the previous one, and Put on court, Add to queue and Save lineup close the whole stack. A saved lineup, an accepted suggestion or reviewed drafts added in Generate Queue switch the console to the Main Queue tab. The console is wrapped in PlayerGamesProvider, so a games badge on any face opens "NAME\'s games" (usePlayerGames).',
    'Session done in the footer bar and the dock pill open SessionDoneFlow (the three-step Session done sheet; Confirm Session done pushes /finishing) and are disabled offline: online comes from useConnectivity (the browser\'s connection or the DevMenu\'s Simulate offline toggle; real mode shows a notice that changes need internet instead), the footer shows "Connect to finish and sync this session." and the warn Notice "Working offline on this device. Matches, results and roster changes save here and sync when you reconnect. Session done needs internet." sits under the header. Every other console mutation still works; its toast ends in " · Saved on this device, waiting to sync".',
    'The useNow clock updates every second, including inside sheets, so court starts and advisory endings refresh. Session data refetches every 30 seconds to detect state changes elsewhere.',
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
    'QueueView',
    'GenerateQueueView',
    'SettingsView',
    'PlayersView',
    'LeaderboardView',
    'CourtsAndTime',
    'MatchLineup',
    'SuggestMatch',
    'AutoQueue',
    'PlayerGames',
    'SessionDoneFlow',
    'PlayerProfile',
    'ConsoleHeaderActions',
    'JoinRequests',
    'FacebookPost',
    'ConsoleFooterBar',
    'PageHeader',
    'Tabs',
    'SessionPreparation',
  ],
} satisfies ComponentMeta
