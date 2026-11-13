import type { ComponentMeta } from '@rotra/ui/meta'

export const substitutionSheetMeta = {
  name: 'SubstitutionSheet',
  description:
    'Q-SUBSTITUTE in two steps: "Substitute in match N" picks who is coming off (tiles noting Team A or B), the replacement from present, free players, and Who gets this game? (Nobody by default, the incoming player, or the outgoing player) with "Started M min ago"; then D-SUBSTITUTE "Confirm substitution" shows Out, In with level, Team, Gets this game, and the credit warning.',
  usage: [
    'Open it from Substitute player on the Active match sheet. The container holds the step, the two players and the credit choice, builds the candidate list with substitutionCandidates() from the match rules, and runs useSubstitutePlayer on Confirm substitution.',
    'Pass candidates as an empty list when nobody is free: the sheet shows "No present player is free right now." and Review substitution stays disabled. Incoming and outgoing credit cards stay disabled until that player is chosen.',
    'The pick step is a SwapPickerSheet: its × ("Back to match N") and backdrop return to the Active match sheet; open it from Substitute in PlayerActionSheet with that player already coming off; Back on the confirm step returns to the pick step with the players and credit kept. Success returns to Q-ACTIVE-MATCH with the "Nathan in for Raymark" toast.',
    'Not for swapping players before Start match: that is lineup editing on the Match queue or Replace player on Q-ON-COURT, not a substitution.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-SUBSTITUTE › SHEETS.sub (pick, Who gets this game?, and confirm steps)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/screens/product/dialogs.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: [
    'ActiveMatchSheet',
    'SwapPickerSheet',
    'PlayerPickerSheet',
    'ConfirmSheet',
    'ChoiceGroup',
    'KeyValueList',
  ],
} satisfies ComponentMeta
