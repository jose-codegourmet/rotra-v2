import type { ComponentMeta } from '@rotra/ui/meta'

export const savedPlayersMeta = {
  name: 'SavedPlayers',
  description:
    'Q-SAVED-PLAYERS container: useClubPlayers with the search and filters held in the URL, LetterGroup sections with the AlphabetIndex rail, SavedPlayerCard grid, PlayerProfileSheet and InviteSheet (useCreatePlayerInvite).',
  usage: [
    'Rendered by /saved-players inside a Suspense boundary (useSearchParams). Back restores the filters because they live in the query string.',
    'Live placement ("Playing · Court 1", "At the session") comes from the live session roster and matches; no phone number ever reaches the DOM.',
  ],
  docs: ['docs/screens/product/modules/queue/players-roster.md'],
  related: [
    'SavedPlayersFilterBar',
    'SavedPlayerCard',
    'LetterGroup',
    'AlphabetIndex',
    'PlayerProfileSheet',
    'InviteSheet',
  ],
} satisfies ComponentMeta
