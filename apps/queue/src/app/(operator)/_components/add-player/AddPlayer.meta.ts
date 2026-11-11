import type { ComponentMeta } from '@rotra/ui/meta'

export const addPlayerMeta = {
  name: 'AddPlayer',
  description:
    'The Add player sheet container (Q-ADD-PLAYER / Q-ASSESS): AddPlayerSheet on useAddSavedPlayerToSession, useAddDirectoryPlayerToSession and useAddNewPlayerToSession, saved players from useClubPlayers, Player Information results from usePlayerDirectorySearch. A pick with a level is added in one tap (the sheet decides); no identity check.',
  usage: [
    'Opened from Add player in preparation and Add late player in the live console (live follows the session state) with a sessionId, and from Saved players › Add player without one; keep one instance per page.',
    "Without a sessionId it uses the sheet's club context on useAddNewSavedPlayer and useAddDirectoryPlayerToClub: it saves to the saved players only and never touches a session; an already-saved profile or phone returns the sheet to the list.",
    'Owns the add mutations, success and failure toasts, and the status line: every add toasts the mutation message, bumps addedCount so the sheet clears its tab and refocuses, and the footer turns to Done.',
    'With a session whose roster is at the slot budget, every add first opens OverfillConfirm (D-OVERFILL, #735): Add anyway sends allowOverfill, Add to waitlist sends toWaitlist, Cancel keeps the Add player sheet as it was.',
    'Refused adds show the mutation message on the card or form; nothing is claimed as added.',
  ],
  docs: [
    'docs/screens/product/modules/queue/players-roster.md#q-add-player--searchadd-to-roster',
    'docs/business_logic/product/queue/modules/players/README.md#entry-and-identity',
  ],
  related: ['AddPlayerSheet', 'PlayerConfirmCard', 'NewPlayerForm', 'PreparationRoster'],
} satisfies ComponentMeta
