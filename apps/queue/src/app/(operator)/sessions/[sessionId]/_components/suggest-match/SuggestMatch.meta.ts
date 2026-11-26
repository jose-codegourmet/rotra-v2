import type { ComponentMeta } from '@rotra/ui/meta'

export const suggestMatchMeta = {
  name: 'SuggestMatch',
  description:
    'The Suggested match sheet container (Q-SUGGEST): SuggestedMatchSheet on one lineup from generateMatches(…, 1) over useQueueSession, useSessionRoster and useSessionMatches, added with useAddSuggestedMatch.',
  usage: [
    'Mounted once by SessionConsole and opened by Suggest in the Queue view. Each open draws a fresh suggestion; Reshuffle draws another (the faces deal back in) and clears the switched flag; ← Back closes the sheet until the stacked-dialog back stack arrives (Q29.7), which also wires tapping a player card to Replace. When nothing can be suggested (both formats off, too few present) the reason from the rules shows with Close.',
    'Switching two players (drag or ← / →) changes only the shown lineup, toasts "Mikee and Dexter switched sides" and marks it switched, so Add to queue then adds it protected; accepting without switching leaves it unprotected (no lock on the card).',
    'Add to queue toasts "Suggestion added to the queue", closes and calls onAdded so the shell switches to the Queue tab; a refusal is an error toast with the sheet kept.',
    'A player card opens PlayerProfile with Back to suggestion; closing it returns to the same lineup.',
  ],
  docs: [
    'docs/screens/product/modules/queue/match-queue.md#q-suggest--one-suggested-lineup',
    'docs/business_logic/product/queue/modules/queueing/README.md#suggest',
    'docs/business_logic/product/queue/modules/queueing/README.md#ways-to-add-waiting-matches',
  ],
  related: [
    'SuggestedMatchSheet',
    'TeamLineup',
    'MatchLineup',
    'AutoQueue',
    'PlayerProfile',
    'QueueView',
    'SessionConsole',
  ],
} satisfies ComponentMeta
