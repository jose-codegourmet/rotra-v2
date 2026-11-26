import type { ComponentMeta } from '@rotra/ui/meta'

export const backToPreparationMeta = {
  name: 'BackToPreparation',
  description:
    "D-BACK-TO-PREP container: the live console ⋯ menu's Back to preparation… confirmation on ConfirmSheet and useBackToPreparation (owner, November 25, 2026). Lists the level unlock, the planned time it goes back to, the matches removed and that closed join requests stay closed; Keep it live / Back to preparation.",
  usage: [
    'Rendered by SessionConsole; the ⋯ item is disabled with backToPreparationBlocker() (a game has started, or offline), and the dialog repeats that reason as a warn Notice.',
    'The planned time is session.plannedBeforeStart (kept at Start), or the current planned window for sessions started before it was kept.',
    'On success: the toast "Back to preparation · levels unlocked · N matches removed" and the preparation page.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.backToPrep, ACT.confirmBackToPrep',
  },
  docs: [
    'docs/mockup-changes/2026-11-25-queue-back-to-preparation.md',
    'docs/screens/product/dialogs.md#d-back-to-prep--undo-start',
    'docs/business_logic/product/queue/modules/sessions/README.md',
  ],
  related: ['ConfirmSheet', 'ConsoleHeaderActions', 'SessionConsole'],
} satisfies ComponentMeta
