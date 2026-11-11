import type { ComponentMeta } from '@rotra/ui/meta'

export const playerProfileMeta = {
  name: 'PlayerProfile',
  description:
    "The live console's player profile dialog: PlayerProfileSheet (the banner profile card) on useClubPlayers for one saved player, with the session's roster level and the Tonight · line from useSessionRoster and useSessionMatches while the session is prepared or live; closed with Close.",
  usage: [
    'Mount once in SessionConsole; every view (courts, queue cards, Players, Leaderboard) opens it by passing the clubPlayerId of the tapped picture. Views work with roster ids, so they map a SessionPlayer to its clubPlayerId before calling.',
    'Renders nothing until the saved players are loaded and the id is known; the sheet never shows a phone number.',
    'A container that opens it from its own sheet (SuggestMatch) passes backLabel and onBack, so the footer reads Back to suggestion and returns to that sheet.',
    'Preparation keeps its own copy inside PreparationRoster; this one is for the console only.',
    'The session comes from the route (useParams sessionId). Finished sessions (record, recovery) show no Tonight line and the level badge falls back to the suggestion.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-courts--court-cards',
    'docs/screens/product/modules/queue/players-roster.md',
  ],
  related: ['PlayerProfileSheet', 'SessionConsole', 'SessionView', 'PreparationRoster'],
} satisfies ComponentMeta
