import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionPodiumMeta = {
  name: 'SessionPodium',
  description:
    'The session podium container (D-2026-11-25-04; rotra-queue.html sessionPodium and sheet podiumPlace): TopThreePodium over places 1 to 3 of the session standings ("This session · N players", steps "3 W · 1 L"), and PodiumPlaceDialog for a shared place ("Same wins and losses: 2 W and 1 L each.", rows "W · L · games · win rate").',
  usage: [
    'Pass every standings row with its dense position (1, 1, 2), the same rows as the table under it; the caption counts them.',
    'onOpenPlayer(id) opens a one-player place; from the dialog it is onOpenPlayer(id, back), where back reopens the dialog (PlayerProfile backLabel "place"). Omit it for faces that open nothing (a visitor on the public page): a shared place still opens the dialog, with plain rows.',
    'Used by the console Leaderboard view, the session record Results tab and the public page Leaderboard tab. Names and pictures are never masked.',
  ],
  docs: [
    'docs/screens/product/modules/queue/leaderboards.md#podium',
    'docs/screens/product/modules/queue/session-console.md#q-leaderboard--tonights-standings',
  ],
  related: [
    'TopThreePodium',
    'PodiumPlaceDialog',
    'LeaderboardView',
    'RecordResultsTab',
    'SessionLeaderboard',
  ],
} satisfies ComponentMeta
