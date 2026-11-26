import type { ComponentMeta } from '@rotra/ui/meta'

export const replacePlayerSheetMeta = {
  name: 'ReplacePlayerSheet',
  description:
    'Replace a player in match N, in the SwapPickerSheet: "Who\'s coming out?", Swap from match (when onPickSwap is given), Suggestion (with All players behind Other), then the note and Replace player. On court it is a lineup change; Playing, the "Replace fixes a mistake" notice says the replacement gets the whole game and the player taken out gets nothing.',
  usage: [
    'On court: open it from Replace player in OnCourtSheet. Playing: open it from Replace in PlayerActionSheet with that player already coming out, and pass playing.',
    'inMatch lists everyone in the match, Team A first, each with the team and whether they are present. candidates are present players not in the match and not busy; others are the rest of the roster (away, on court, playing), greyed out in All players.',
    'The × ("Back to match N") and the backdrop call onBack. Replace player needs both players. The owner rechecks; when the recheck fails keep the sheet open and pass message "Something changed. Review the match again." Set isPending while it saves.',
    'Swap from match: pass onPickSwap, swapId and onSwapFromMatch to show the row. It lists the opponents of the player coming out (derived from inMatch), each marked "Team B · opponent"; before anyone is coming out it says "Choose who\'s coming out to see who they can swap with." When swapId is set the primary button reads Swap players and calls onSwapFromMatch(outId, opponentId); the note "Nina and Theo swap places: each joins the other\'s partner." shows. Picking from Suggestion or All players is a plain replace: the owner clears swapId (and a swap pick clears inId). Omit onPickSwap and the row does not render (Substitute never has it).',
    'No credit question and no substitution record. Use SubstitutionSheet when a player really has to leave mid-game.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'SHEETS.replace (ACT.openReplace, ACT.pickPlayerAction, ACT.confirmReplace), swapPicker()',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
    'docs/mockup-changes/2026-11-13-queue-replace-during-play.md',
    'docs/mockup-changes/2026-11-19-queue-replace-swap-from-match.md',
  ],
  related: ['SwapPickerSheet', 'PlayerActionSheet', 'OnCourtSheet', 'SubstitutionSheet'],
} satisfies ComponentMeta
