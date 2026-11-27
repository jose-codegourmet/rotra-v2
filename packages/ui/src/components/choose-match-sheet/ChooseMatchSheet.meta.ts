import type { ComponentMeta } from '@rotra/ui/meta'

export const chooseMatchSheetMeta = {
  name: 'ChooseMatchSheet',
  description:
    'Q-CHOOSE-MATCH, "Put a match on Court N": the waiting Main Queue matches as compact MatchCards in a CardCarousel (one a slide with the next peeking, "Previous match" / "Next match" arrows, dots, side masks while more are that way). Each card shows only Put on court and Edit; footer ← Back.',
  usage: [
    'Open it from Pick from the queue in Court N is free (FreeCourtSheet). Pass every waiting match in queue order with its status from matchStatus(match, ctx); the sheet never works out eligibility.',
    'Put on court is named "Put on Court N" and is disabled while the match cannot start (a player is on court or not present). Queue order is a suggestion, not a rule: any ready match can go next. It goes on court getting ready; the Queue Master starts it from the court.',
    'The cards have no remove, no reorder handle, no queue-flow arrow and no player swap-drag: a drag anywhere on a card swipes the carousel, while taps on faces and buttons still work.',
    'With no waiting match it shows "The Main Queue is empty." The back stack (Back returns to Court N is free) is the container\'s (Q29.7).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'SHEETS.chooseMatch (ACT.openChooseMatch, .ch-wrap .ch-embla .ch-slide .ch-dots, queueCard(…, compact))',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
    'docs/mockup-changes/2026-11-26-queue-free-court-flow.md',
  ],
  related: ['FreeCourtSheet', 'CardCarousel', 'MatchCard', 'StartMatchSheet', 'Sheet'],
} satisfies ComponentMeta
