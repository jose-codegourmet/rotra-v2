import type { ComponentMeta } from '@rotra/ui/meta'

export const addPlayerSheetMeta = {
  name: 'AddPlayerSheet',
  description:
    'The Add player sheet (Q-ADD-PLAYER) that stays open while adding: Saved players, Player Information and New player tabs, the "All N slots are taken" waitlist warning, the status line after each add, and the level card for a pick with no level. The title is always "Add player".',
  usage: [
    'Open it from Add player (preparation) or Add late player (live console, live=true). The container owns the add mutations: pass isPending, serverError, and after each success a new lastAdded and addedCount so the tab clears and focus returns to its first field.',
    'savedPlayers is the whole club list; inSessionIds (roster + waitlist) are left out of it and counted in "N saved players are already in this session and not listed."',
    'Player Information: report the query with onDirectorySearch, pass directoryResults and directoryLoading (Skeleton rows; end it yourself, it never spins forever). offline swaps the tab for the reconnect notice.',
    'onConfirm receives the picked candidate, its source and the level. Any pick with a level (its suggestion) is added in one tap at that level; a pick without one opens PlayerConfirmCard for the level. There is no identity check (withdrawn November 11, 2026, D-2026-11-11-03); onSubmitNewPlayer receives the New player form values.',
    'Saved players rows show the RTR ID, "Not registered yet" for an unclaimed player without one, or "Guest".',
    'Candidates never carry a phone number; phoneHidden only shows the hidden-phone line.',
    'context="club" is Saved players › Add player with no session: no session props, Player Information (default) and New player tabs only, "Adding to your saved players. They won\'t be added to a session.", an optional level (onConfirm and onSubmitNewPlayer may get level null) and the primary Save player.',
    'serverError keeps the card or form with what was typed (a failed save); with serverErrorReturnsToList (a duplicate, refused as a conflict) the sheet drops the card and shows the error above the list, so nobody is ever replaced.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'SHEETS.add (Saved players / Player Information / New player tabs, pick state), afterAdd()',
  },
  docs: [
    'docs/screens/product/modules/queue/players-roster.md#q-add-player--searchadd-to-roster',
    'docs/mockup-changes/2026-11-11-queue-club-only-unclaimed.md',
    'docs/business_logic/product/queue/modules/players/README.md#entry-and-identity',
    'docs/business_logic/product/queue/modules/players/README.md#slots-and-waitlist',
  ],
  // Active sessions admit directly; the planning budget stays advisory.
  variants: ['prepared', 'active', 'full', 'over-plan', 'pending', 'error'],
  related: ['PlayerConfirmCard', 'NewPlayerForm', 'SegmentedControl', 'Sheet', 'SlotMeter'],
} satisfies ComponentMeta
