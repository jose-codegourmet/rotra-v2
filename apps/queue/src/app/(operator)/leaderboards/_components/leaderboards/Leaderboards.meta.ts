import type { ComponentMeta } from '@rotra/ui/meta'

export const leaderboardsMeta = {
  name: 'Leaderboards',
  description:
    'Q-LEADERBOARDS container (D-2026-11-25-04; rotra-queue.html viewLeaderboards): "Leaderboards" with Club / ROTRA tabs (`?tab=rotra`), LeaderboardPeriodSwitch (Top annual, quarterly, monthly, weekly) with the Manila calendar period and "compared with last …", TopThreePodium for places 1 to 3, LeaderboardList rows from place 4, and the Who appears here card.',
  usage: [
    'Rendered by /leaderboards (left nav item Leaderboards, after Saved players). Club reads useClubLeaderboard(signed-in club account id, period); ROTRA reads useLeaderboard(period). Every page is read so the list holds the top 50 plus anyone sharing the 50th place.',
    'Places come from each row\'s dense position (same wins and win rate share one, 1, 1, 2). A shared podium place opens PodiumPlaceDialog ("Same wins and win rate: 6 wins and 67% each this month."); a row there opens LeaderboardProfile with Back to place.',
    "Only this club's saved players (matched by ROTRA player id) open a profile; other clubs' players are plain. On ROTRA the club line shows this club's name for its own players; rows carry no club for other clubs' players yet.",
    'Empty list: "No one has won a standard match this … yet. The list fills as your sessions finish." (ROTRA: "as clubs finish sessions"), under three empty podium steps. Everyone on the podium: "Everyone on this list is on the podium."',
  ],
  docs: ['docs/screens/product/modules/queue/leaderboards.md#q-leaderboards--leaderboards-page'],
  related: [
    'TopThreePodium',
    'PodiumPlaceDialog',
    'LeaderboardPeriodSwitch',
    'LeaderboardList',
    'LeaderboardRow',
    'LeaderboardProfile',
  ],
} satisfies ComponentMeta
