import type { ComponentMeta } from '@rotra/ui/meta'

export const playerProfileMeta = {
  name: 'PlayerProfile',
  description:
    'The live console\'s player profile dialog: PlayerProfileSheet on useClubPlayers for one saved player, closed with Close.',
  usage: [
    'Mount once in SessionConsole; every view (courts, queue cards, Players, Leaderboard) opens it by passing the clubPlayerId of the tapped picture. Views work with roster ids, so they map a SessionPlayer to its clubPlayerId before calling.',
    'Renders nothing until the saved players are loaded and the id is known; the sheet never shows a phone number.',
    'Preparation keeps its own copy inside PreparationRoster; this one is for the console only.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-courts--court-cards',
    'docs/screens/product/modules/queue/players-roster.md',
  ],
  related: ['PlayerProfileSheet', 'SessionConsole', 'SessionView', 'PreparationRoster'],
} satisfies ComponentMeta
