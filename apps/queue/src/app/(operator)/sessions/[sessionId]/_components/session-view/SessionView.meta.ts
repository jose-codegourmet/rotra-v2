import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionViewMeta = {
  name: 'SessionView',
  description:
    'Q-COURTS container, the console\'s Session view: "Courts" with "F of C free", a CourtCard per court in one of three states (Free, Getting ready for a match On court, Playing) built from the match rules (courtMatches, nextEligibleForCourt, matchStatus, isBookingEnded, countedGames for the game badges) on useQueueSession, useSessionRoster and useSessionMatches, the + Add court tile, the "A match never starts by itself…" line, then UpcomingQueueRow with the waiting queue, each name with its wait timer (waitMinutes, or On court / Playing / Not here) while the session is live.',
  usage: [
    'Rendered by SessionConsole inside the Session tab. A 5v5 on two courts renders one merged card under its first court; a court past its closing time shows Booking ended in warn while its game keeps going. Minutes in game and Booking ended are measured against the `now` the console passes (its one-second clock), never Date.now() at render.',
    "Player pictures on courts and queue cards report the roster player's clubPlayerId through onOpenProfile; More queues calls onOpenQueue; + Add court calls onAddCourt (CourtsAndTime, mounted by the shell).",
    'Remove on a free court calls useRemoveCourt straight away with a "LABEL removed" toast and no dialog (dialogs.md); the last court\'s Remove is disabled by CourtCard, and an occupied court is refused with the "Only a free court can be removed" error toast.',
    'Remove × on an upcoming queue card calls useRemoveWaitingMatch straight away with the "Waiting match N removed" toast and no dialog (no game is recorded); Edit appears once onEditMatch is given, and Add match on a free court with nothing to start once onAddMatch is given (both Queue › Match editing, the MatchLineup container). Open match on a Playing court card appears once onOpenMatch is given (Queue › Match control, the ActiveMatch container). Put on court on a free court places a one-court match straight away with usePlaceOnCourt ("Match N on Court X · getting ready"); a 5v5 goes through onStartMatch (the Put on court sheet). On a Getting ready card, Start match is one tap on useStartMatch ("Match N started on Court X"; a not-present or busy player disables it with the reason) and Open match opens the On court sheet (OnCourt, mounted here). Nothing starts without the Start match tap.',
    'While the session is live, the Courts header carries CourtFillSwitch (Manual Queue | Auto Queue, useSetCourtFillMode, refused offline with the error toast) and the ShortOnPlayersBanner (shortOnPlayers) sits above Courts; free courts say "Not enough free players." and keep Add match. A court that reaches its planned opening time in Auto Queue is filled on the console refresh (useFillOpenedCourts). Booking ended shows on free, Getting ready and Playing cards once the booked end has passed.',
    'Shows card-sized Skeletons while any of the three queries loads and a QueryError when one fails.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-courts--court-cards',
    'docs/business_logic/product/queue/modules/sessions/README.md#running',
    'docs/business_logic/product/queue/modules/queueing/README.md#shared-waiting-list',
  ],
  related: [
    'SessionConsole',
    'CourtsAndTime',
    'CourtCard',
    'OnCourt',
    'AddCourtTile',
    'UpcomingQueueRow',
    'MatchCard',
    'PlayerProfile',
  ],
} satisfies ComponentMeta
