import type { ComponentMeta } from '@rotra/ui/meta'

export const swapMatchSheetMeta = {
  name: 'SwapMatchSheet',
  description:
    'The Swap with the queue confirmation for a match On court: "Swap match N with #P?", the sentence saying where each match goes, and one before → after row for the court with the after card in the accent border. Each picture shows games this session as a badge and minutes since the last game in the queue wait colors.',
  usage: [
    'Open it from Swap with #P in OnCourtSheet (pass fromMatch: the back action reads Back to match) or from "Swap with #P · Match N" in the court card’s ⋯ menu (Cancel).',
    'Pass current (the On court match), incoming (the next waiting match that is ready for this court) and position (the incoming match’s queue place, which the current match takes). The queue slot is only described in the sentence, never drawn.',
    'Each player needs games (counted this session) and waitMinutes (minutes since their last game, as on the queue cards): under 10 plain, 10–15 warning, 16+ error, always with the number shown.',
    'Swap matches rechecks that the same match is still next. Set isPending while it runs; when the recheck fails keep the sheet open and pass message "Something changed. Review the match again." Nothing starts here: both matches stay unstarted until Start match.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.swap (ACT.openSwap, ACT.confirmSwap)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
    'docs/mockup-changes/2026-11-06-queue-on-court-and-sub-credit.md',
  ],
  related: ['OnCourtSheet', 'PlayerFaceButton', 'CourtCard', 'MatchCard'],
} satisfies ComponentMeta
