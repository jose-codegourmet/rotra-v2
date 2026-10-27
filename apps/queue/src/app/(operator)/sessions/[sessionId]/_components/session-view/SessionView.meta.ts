import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionViewMeta = {
  name: 'SessionView',
  description:
    'Q-COURTS container, the console\'s Session view: "Courts" with "F of C free", a CourtCard per court built from the match rules (activeMatches, nextEligibleForCourt, matchStatus, isBookingEnded) on useQueueSession, useSessionRoster and useSessionMatches, the + Add court tile, the "A match never starts by itself…" line, then UpcomingQueueRow with the waiting queue.',
  usage: [
    'Rendered by SessionConsole inside the Session tab. A 5v5 on two courts renders one merged card under its first court; a court past its closing time shows Booking ended in warn while its game keeps going. Minutes in game and Booking ended are measured against the `now` the console passes (its 30-second clock), never Date.now() at render.',
    'Player pictures on courts and queue cards report the roster player\'s clubPlayerId through onOpenProfile; More queues calls onOpenQueue; + Add court calls onAddCourt (CourtsAndTime, mounted by the shell).',
    'Remove on a free court calls useRemoveCourt straight away with a "LABEL removed" toast and no dialog (dialogs.md); the last court\'s Remove is disabled by CourtCard, and an occupied court is refused with the "Only a free court can be removed" error toast.',
    'Remove × on an upcoming queue card calls useRemoveWaitingMatch straight away with the "Waiting match N removed" toast and no dialog (no game is recorded); Edit appears once onEditMatch is given, and Add match on a free court with nothing to start once onAddMatch is given (both Queue › Match editing, the MatchLineup container). Open match on an in-game court card appears once onOpenMatch is given (Queue › Match control, the ActiveMatch container). Review and start, Pick another and Start are deliberately not passed here: Queue › Match control wires them.',
    'Shows card-sized Skeletons while any of the three queries loads and a QueryError when one fails.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-courts--court-cards',
    'docs/business_logic/product/queue/modules/sessions/README.md#running',
    'docs/business_logic/product/queue/modules/queueing/README.md#shared-waiting-list',
  ],
  related: ['SessionConsole', 'CourtsAndTime', 'CourtCard', 'AddCourtTile', 'UpcomingQueueRow', 'MatchCard', 'PlayerProfile'],
} satisfies ComponentMeta
