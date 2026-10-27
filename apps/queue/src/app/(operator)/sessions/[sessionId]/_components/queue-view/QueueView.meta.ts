import type { ComponentMeta } from '@rotra/ui/meta'

export const queueViewMeta = {
  name: 'QueueView',
  description:
    'Q-QUEUE container, the console\'s Queue view: "Queued matches" with Add match, Suggest, Auto queue and Regenerate (primary while anything needs attention, disabled when the queue is empty), the warn Notice "N waiting matches need attention. Edit the lineup to swap the player, or regenerate.", the "One waiting list for every court. MODE mode guides suggestions; you can override any of it." line, and the snake QueueGrid of MatchCards built from useSessionMatches, useSessionRoster, useQueueSession and matchStatus.',
  usage: [
    'Listed in SessionConsole\'s VIEWS registry under the Queue tab (chips "N waiting" and the warn "N need attention"). The grid orders cards in a snake with flow arrows; cards are keyed by match id, so a keyboard reorder keeps focus on the moved card\'s ⠿ handle.',
    'Reorder by drag or by the arrow keys on the handle calls useMoveMatch and toasts "Queue order changed" or "Match N moved to #P". Remove × calls useRemoveWaitingMatch straight away with the "Waiting match N removed" toast and no dialog (dialogs.md: no game is recorded).',
    'Dragging a player onto someone on the other team, or ← / → on a focused player, calls useSwapPlayers with the two roster ids; the match becomes manual and protected, so its card then shows the lock. Protected cards still show their attention problem. Pictures open the profile through onOpenProfile.',
    'The sheets are Queue › Match editing and Queue generation: Add match, Suggest, Auto queue and Regenerate are disabled until onAddMatch, onSuggest, onAutoQueue and onRegenerate are given, and the cards\' Edit button appears only once onEditMatch is given. Start is Queue › Match control.',
    'Empty reads "No waiting matches. Use Auto queue to generate a few, or add one yourself.". Shows header and card-sized Skeletons while the session, roster or matches load and a QueryError when one fails; onOpenQueue and now are accepted but unused here.',
  ],
  docs: [
    'docs/screens/product/modules/queue/match-queue.md#q-queue--one-waiting-list',
    'docs/screens/product/modules/queue/session-console.md#q-console--operator-workspace',
    'docs/business_logic/product/queue/modules/queueing/README.md#shared-waiting-list',
    'docs/business_logic/product/queue/modules/queueing/README.md#attention-and-regeneration',
    'docs/screens/product/dialogs.md',
  ],
  related: [
    'SessionConsole',
    'SessionView',
    'QueueGrid',
    'MatchCard',
    'SwapSidesArea',
    'Notice',
    'PlayerProfile',
  ],
} satisfies ComponentMeta
