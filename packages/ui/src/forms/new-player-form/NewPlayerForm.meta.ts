import type { ComponentMeta } from '@rotra/ui/meta'

export const newPlayerFormMeta = {
  name: 'NewPlayerForm',
  description:
    'Q-ADD-PLAYER › New player: full or display name (required), nickname and phone (optional), and the level for this club. Submits "Confirm player slot", or "Add to waitlist" when every slot is taken.',
  usage: [
    'Use inside AddPlayerSheet on the New player tab; it works offline because nothing is looked up.',
    'onSubmit receives nickname and phone as null when empty, the phone in E.164, and a required level. No phone means a guest; a phone makes profile lookup possible when the session syncs.',
    'Pass id and hideSubmit to submit it from a sheet footer button (type="submit" form={id}). Remount it (new key) to clear it after an add; autoFocus puts the cursor back in the name field.',
    'The form never adds: the container owns the mutation, the success toast and serverError. A failed add keeps what was typed.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'SHEETS.add › New player tab, confirmNew()',
  },
  docs: [
    'docs/screens/product/modules/queue/players-roster.md#q-add-player--searchadd-to-roster',
    'docs/business_logic/product/queue/modules/players/README.md#entry-and-identity',
    'docs/coding-conventions.md#6-forms',
  ],
  related: ['AddPlayerSheet', 'PlayerConfirmCard', 'LevelSelect', 'Field'],
} satisfies ComponentMeta
