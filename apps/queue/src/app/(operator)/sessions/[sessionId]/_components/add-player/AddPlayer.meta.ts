import type { ComponentMeta } from '@rotra/ui/meta'

export const addPlayerMeta = {
  name: 'AddPlayer',
  description:
    'The Add player sheet container (Q-ADD-PLAYER / Q-IDENTIFY / Q-ASSESS): AddPlayerSheet on useAddSavedPlayerToSession, useAddDirectoryPlayerToSession and useAddNewPlayerToSession, saved players from useClubPlayers, Player Information results from usePlayerDirectorySearch, and the one-tap rule from needsConfirmStep.',
  usage: [
    'Opened from Add player in preparation and Add late player in the live console (live follows the session state); keep one instance per page.',
    'Owns the add mutations, success and failure toasts, and the status line: every add toasts the mutation message, bumps addedCount so the sheet clears its tab and refocuses, and the footer turns to Done.',
    'Refused adds show the mutation message on the card or form; nothing is claimed as added.',
  ],
  docs: [
    'docs/screens/product/modules/queue/players-roster.md#q-add-player--searchadd-to-roster',
    'docs/business_logic/product/queue/modules/players/README.md#entry-and-identity',
  ],
  related: ['AddPlayerSheet', 'PlayerConfirmCard', 'NewPlayerForm', 'PreparationRoster'],
} satisfies ComponentMeta
