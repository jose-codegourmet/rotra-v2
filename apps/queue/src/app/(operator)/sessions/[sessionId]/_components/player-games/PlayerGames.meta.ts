import type { ComponentMeta } from '@rotra/ui/meta'

export const playerGamesMeta = {
  name: 'PlayerGames',
  description:
    'D-SESSION-GAMES container: PlayerGamesProvider mounts one "NAME\'s games" dialog for the console, and usePlayerGames().open(rosterPlayerId) opens it from a games badge on a court face, a Main Queue tile or a Generate Queue draft tile.',
  usage: [
    'Wrap the console once in PlayerGamesProvider (sessionId). Views call usePlayerGames().open(id) with the roster id a face carries; outside the provider open does nothing.',
    'Matches lists the player\'s finished matches (completed and invalid) latest first with Counts, Not counted or Invalid · not counted; Planned queue lists their waiting Main Queue matches nearest first. Built from useSessionMatches, useSessionRoster and useQueueSession; the games count is gamesPlayedFor, with "set by hand" from the roster adjustment.',
    'A face in the dialog closes it and opens PlayerProfile with Back to games, which reopens the dialog on the same pill.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-console--operator-workspace',
    'docs/screens/product/dialogs.md',
    'docs/mockup-changes/2026-11-23-queue-games-badge-session-matches.md',
  ],
  related: [
    'SessionGamesDialog',
    'PlayerProfile',
    'SessionView',
    'QueueView',
    'CourtCard',
    'MatchCard',
  ],
} satisfies ComponentMeta
