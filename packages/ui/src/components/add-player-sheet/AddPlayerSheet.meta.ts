import type { ComponentMeta } from '@rotra/ui/meta'

export const addPlayerSheetMeta = {
  name: 'AddPlayerSheet',
  description:
    'The Add player sheet (Q-ADD-PLAYER) that stays open while adding: Saved players, Player Information and New player tabs, the "All N slots are taken" waitlist warning, the status line after each add, and the Confirm player card for picked players.',
  usage: [
    'Open it from Add player (preparation) or Add late player (live console, live=true). The container owns the add mutations: pass isPending, serverError, and after each success a new lastAdded and addedCount so the tab clears and focus returns to its first field.',
    'savedPlayers is the whole club list; inSessionIds (roster + waitlist) are left out of it and counted in "N saved players are already in this session and not listed."',
    'Player Information: report the query with onDirectorySearch, pass directoryResults and directoryLoading (Skeleton rows; end it yourself, it never spins forever). offline swaps the tab for the reconnect notice.',
    'onConfirm receives the picked candidate, its source, the chosen level and the identity check (unclaimed profiles only); onSubmitNewPlayer receives the New player form values. needsConfirmStep lets a container add registered profiles with a level in one tap (Q03.6).',
    'Candidates never carry a phone number; phoneHidden only removes the Phone confirmed check and shows the hidden-phone line.',
    'serverError keeps the card or form with what was typed (a failed save); with serverErrorReturnsToList (a duplicate, refused as a conflict) the sheet drops the card and shows the error above the list, so nobody is ever replaced.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'SHEETS.add (Saved players / Player Information / New player tabs, pick state), afterAdd()',
  },
  docs: [
    'docs/screens/product/modules/queue/players-roster.md#q-add-player--searchadd-to-roster',
    'docs/screens/product/modules/queue/players-roster.md#q-identify--confirm-correct-player',
    'docs/business_logic/product/queue/modules/players/README.md#entry-and-identity',
    'docs/business_logic/product/queue/modules/players/README.md#slots-and-waitlist',
  ],
  related: ['PlayerConfirmCard', 'NewPlayerForm', 'SegmentedControl', 'Sheet', 'SlotMeter'],
} satisfies ComponentMeta
