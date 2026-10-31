import type { ComponentMeta } from '@rotra/ui/meta'

export const suggestedMatchSheetMeta = {
  name: 'SuggestedMatchSheet',
  description:
    'Q-SUGGEST: one suggested lineup with format and mode chips, Team A VS Team B that can be switched by dragging or the arrow keys, the Why this lineup card, and Skip suggestion, Edit then add and Add to queue. Shows the reason with Close when no lineup is possible.',
  usage: [
    "Open it from Suggest on the Queue tab. The container generates the lineup (Q05.4) and passes it in with each player's counted games; the sheet never picks players.",
    'Pass lineup null with the reason from the rules ("Only N players are present. Doubles needs 4. …") when nothing can be suggested.',
    'onSwap changes only the shown lineup (toast "Mikee and Dexter switched sides"); adding it afterwards puts it in protected.',
    'Never add win probabilities or fatigue scores to the Why this lineup card.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-SUGGEST › SHEETS.suggest',
  },
  docs: [
    'docs/screens/product/modules/queue/match-queue.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  related: ['TeamLineup', 'MatchPlayerCard', 'SwapSidesArea', 'AutoQueueSheet', 'Sheet'],
} satisfies ComponentMeta
