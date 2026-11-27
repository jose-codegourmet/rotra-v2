import type { ComponentMeta } from '@rotra/ui/meta'

export const suggestedMatchSheetMeta = {
  name: 'SuggestedMatchSheet',
  description:
    'Q-SUGGEST: one suggested lineup with format and mode chips and a Reshuffle button, Team A VS Team B where each player card is a Replace button and sides can be switched by dragging or the arrow keys, the Why this lineup card, and the footer ← Back and Add to queue. Shows the reason with Close when no lineup is possible.',
  usage: [
    'Pass winChance for the pair chips beside TEAM A / TEAM B and onOpenWinChance to open WinChanceDialog; no chip without winChance.',
    "Open it from Suggest on the Queue tab. The container generates the lineup (Q05.4) and passes it in with each player's counted games; the sheet never picks players.",
    'Pass lineup null with the reason from the rules ("Only N players are present. Doubles needs 4. …") when nothing can be suggested.',
    'Reshuffle (onReshuffle) draws a different fair lineup in the container; change dealKey with each draw and the faces and VS deal back in with a short staggered flip (reduced motion shows the new lineup without moving; the first render never animates).',
    'Tapping a player card calls onReplace(playerId, team): the container opens ReplacePlayerSheet with that player chosen. The picture still opens the profile (onSelectPlayer). Skip suggestion and Edit then add are gone; ← Back (onBack) returns to the dialog this was opened from.',
    'onSwap changes only the shown lineup (toast "Mikee and Dexter switched sides"); adding it afterwards puts it in protected.',
    'Each player card shows the name stack (D-2026-11-26-09) when the TeamLineupPlayer carries nickname and clubNickname: the first present of club nickname, nickname, full name as the label, the others in smaller lines, then "N/M games".',
    'Never add win probabilities or fatigue scores to the Why this lineup card.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-SUGGEST › SHEETS.suggest',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
    'docs/mockup-changes/2026-11-26-queue-free-court-flow.md',
    'docs/mockup-changes/2026-11-26-queue-name-hierarchy.md',
  ],
  related: [
    'TeamLineup',
    'MatchPlayerCard',
    'SwapSidesArea',
    'ReplacePlayerSheet',
    'FreeCourtSheet',
    'Sheet',
  ],
} satisfies ComponentMeta
