import type { ComponentMeta } from '@rotra/ui/meta'

export const historyViewMeta = {
  name: 'HistoryView',
  description:
    "Q-CONSOLE container, the console's Match History view: LiveMatchHistory on useSessionMatches (every completed and invalid match that started, newest first), with the session's courts from useQueueSession and the roster from useSessionRoster for names, levels and pictures.",
  usage: [
    'Listed in SessionConsole\'s VIEWS registry under the Match History tab, between Leaderboard and Settings; hidden, with its tab, when Record games is off. The tab\'s "N played" chip counts completed and invalid matches, like the prototype.',
    "Every face reports the roster player's clubPlayerId through onOpenProfile (the shell's PlayerProfile); onOpenQueue is accepted but unused here.",
    'The court filter ("all" or a court id) is local useState, not the URL, and resets when the tab is left.',
    'Shows heading- and card-sized Skeletons while the session, roster or matches load and a QueryError when one fails.',
  ],
  docs: ['docs/screens/product/modules/queue/session-console.md'],
  related: ['SessionConsole', 'LiveMatchHistory', 'PlayerProfile', 'LeaderboardView'],
} satisfies ComponentMeta
