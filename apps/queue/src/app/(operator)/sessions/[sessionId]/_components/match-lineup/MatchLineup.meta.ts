import type { ComponentMeta } from '@rotra/ui/meta'

export const matchLineupMeta = {
  name: 'MatchLineup',
  description:
    'The Add match / Edit lineup sheet container (Q-MANUAL with Q-PICK-PLAYER): MatchLineupForm on useAddMatch and useUpdateMatchLineup, its picker candidates from the roster in pickerOrder with games, court and rest minutes from the match rules.',
  usage: [
    'Mounted once by SessionConsole; opened by Add match (the Queue view header and a free court card), by Edit on a queue card (Queue view or upcoming row) and by Edit then add in Suggested match, which arrives as an add request with the lineup pre-filled. Keep one instance per console.',
    'Owns the add and save mutations and their toasts ("Match added to the queue", "Lineup saved · protected from regeneration"); on success it closes and calls onSaved so the shell switches to the Queue tab.',
    'Enabled formats follow the session (Singles never appears while it is off); a match that stopped waiting while the sheet was open simply closes. A save failure (retryable, offline) is an error toast with the lineup kept; any other refusal shows in the sheet.',
    'Remounts the form per request, so a new Add match starts empty and an edit starts from that match.',
  ],
  docs: [
    'docs/screens/product/modules/queue/match-queue.md#q-manual--add-match--edit-lineup',
    'docs/screens/product/modules/queue/match-queue.md#q-pick-player--choose-a-slots-player',
    'docs/business_logic/product/queue/modules/queueing/README.md#manual-editor',
  ],
  related: [
    'MatchLineupForm',
    'PlayerPickerSheet',
    'SuggestMatch',
    'AutoQueue',
    'QueueView',
    'SessionConsole',
  ],
} satisfies ComponentMeta
