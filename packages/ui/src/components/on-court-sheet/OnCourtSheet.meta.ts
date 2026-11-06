import type { ComponentMeta } from '@rotra/ui/meta'

export const onCourtSheetMeta = {
  name: 'OnCourtSheet',
  description:
    'Q-ON-COURT: a match On court but not started. "Match N · Court X · Getting ready" with the format chip (plus Fun game) and the Getting ready chip, Team A VS Team B with switch sides, Replace player, Move to another court, Swap with #P with the line naming the incoming match, and Send back to queue / Start match.',
  usage: [
    'Open it from Open match on a court card showing Getting ready. The card’s own Start match starts the match without this sheet.',
    'Pass blockReason from matchStatus (e.g. "Migs is not present") when the match cannot start: it shows with "Replace the player or send the match back to the queue." and disables Start match.',
    'Pass swapTarget with the next waiting match that is ready for this court (same number of courts, counting this match’s players as free) and its queue position; null disables Swap with the queue and the line says no other match is ready. onSwapWithQueue opens SwapMatchSheet with fromMatch.',
    'Pass canMoveCourt false when no free open court is left (two for 5v5). onMoveCourt opens the Move match sheet; onReplacePlayer opens the Replace player sheet. Both are plain lineup changes: never a substitution, never the credit question.',
    'Start match is one tap: the owner rechecks presence and busy players. Set pendingAction while Start match or Send back runs so neither fires twice and the sheet cannot be dismissed; on a failed recheck keep the sheet open and pass message "Something changed. Review the match again." The timer starts only at Start match.',
    'Do not use for a Playing match; use ActiveMatchSheet (no switching sides there).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'SHEETS.onCourt (ACT.openMatch on a Getting ready court, ACT.startOnCourt, ACT.sendBack)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
    'docs/mockup-changes/2026-11-06-queue-on-court-and-sub-credit.md',
  ],
  related: ['StartMatchSheet', 'SwapMatchSheet', 'ActiveMatchSheet', 'TeamLineup', 'CourtCard'],
} satisfies ComponentMeta
