import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionViewMeta = {
  name: 'SessionView',
  description:
    'Q-COURTS container, the console\'s Session view: "Courts" with "F of C free", a CourtCard per court built from the match rules (activeMatches, nextEligibleForCourt, matchStatus, isBookingEnded) on useQueueSession, useSessionRoster and useSessionMatches, the + Add court tile, the "A match never starts by itself…" line, then UpcomingQueueRow with the waiting queue.',
  usage: [
    'Rendered by SessionConsole inside the Session tab. A 5v5 on two courts renders one merged card under its first court; a court past its closing time shows Booking ended in warn while its game keeps going.',
    'Player pictures on courts and queue cards report the roster player\'s clubPlayerId through onOpenProfile; More queues calls onOpenQueue; + Add court calls onAddCourt (the sheet arrives with Queue › Courts and time).',
    'Review and start, Pick another, Open match, Add match, Start, Edit and Remove are deliberately not passed: Queue › Match queue and Match control wire them, so the cards show no action buttons yet.',
    'Shows card-sized Skeletons while any of the three queries loads and a QueryError when one fails.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-courts--court-cards',
    'docs/business_logic/product/queue/modules/sessions/README.md#running',
    'docs/business_logic/product/queue/modules/queueing/README.md#shared-waiting-list',
  ],
  related: ['SessionConsole', 'CourtCard', 'AddCourtTile', 'UpcomingQueueRow', 'MatchCard', 'PlayerProfile'],
} satisfies ComponentMeta
