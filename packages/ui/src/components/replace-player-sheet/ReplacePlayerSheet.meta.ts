import type { ComponentMeta } from '@rotra/ui/meta'

export const replacePlayerSheetMeta = {
  name: 'ReplacePlayerSheet',
  description:
    'Replace a player in match N, in the SwapPickerSheet: "Who\'s coming out?", Suggested (with All players behind Other), then the note and Replace player. On court it is a lineup change; Playing, the "Replace fixes a mistake" notice says the replacement gets the whole game and the player taken out gets nothing.',
  usage: [
    'On court: open it from Replace player in OnCourtSheet. Playing: open it from Replace in PlayerActionSheet with that player already coming out, and pass playing.',
    'inMatch lists everyone in the match, Team A first, each with the team and whether they are present. candidates are present players not in the match and not busy; others are the rest of the roster (away, on court, playing), greyed out in All players.',
    'The × ("Back to match N") and the backdrop call onBack. Replace player needs both players. The owner rechecks; when the recheck fails keep the sheet open and pass message "Something changed. Review the match again." Set isPending while it saves.',
    'No credit question and no substitution record. Use SubstitutionSheet when a player really has to leave mid-game.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.replace (ACT.openReplace, ACT.pickPlayerAction, ACT.confirmReplace), swapPicker()',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
    'docs/mockup-changes/2026-11-13-queue-replace-during-play.md',
  ],
  related: ['SwapPickerSheet', 'PlayerActionSheet', 'OnCourtSheet', 'SubstitutionSheet'],
} satisfies ComponentMeta
