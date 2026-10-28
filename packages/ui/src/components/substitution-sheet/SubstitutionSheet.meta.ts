import type { ComponentMeta } from '@rotra/ui/meta'

export const substitutionSheetMeta = {
  name: 'SubstitutionSheet',
  description:
    'Q-SUBSTITUTE in two steps: "Substitute in match N" picks who is coming off (tiles noting Team A or B) and the replacement from present, free players, then D-SUBSTITUTE "Confirm substitution" shows Out, In with level, Team and the partial-game warning.',
  usage: [
    'Open it from Substitute player on the Active match sheet. The container holds the step and the two choices, builds the candidate list with substitutionCandidates() from the match rules, and runs useSubstitutePlayer on Confirm substitution.',
    'Pass candidates as an empty list when nobody is free: the sheet shows "No present player is free right now." and Review substitution stays disabled.',
    'Back on the pick step returns to the Active match sheet; Back on the confirm step returns to the pick step with the choice kept. Success returns to Q-ACTIVE-MATCH with the "Nathan in for Raymark" toast.',
    'Not for swapping players before Start match: that is lineup editing on the Match queue, not a substitution.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-SUBSTITUTE › SHEETS.sub (pick and confirm steps)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/screens/product/dialogs.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: ['ActiveMatchSheet', 'PlayerTile', 'PlayerPickerSheet', 'ConfirmSheet', 'KeyValueList'],
} satisfies ComponentMeta
