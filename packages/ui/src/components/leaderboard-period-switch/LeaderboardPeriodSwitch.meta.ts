import type { ComponentMeta } from '@rotra/ui/meta'

export const leaderboardPeriodSwitchMeta = {
  name: 'LeaderboardPeriodSwitch',
  description:
    'The Top annual, Top quarterly, Top monthly and Top weekly switch with its comparison period.',
  usage: [
    'Use under the leaderboard page introduction. Pass the formatted date for the selected list.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-LEADERBOARD › viewBoard (.lb-tabs)',
  },
  docs: ['docs/screens/product/modules/player-information/ranking-history.md'],
  variants: ['year', 'quarter', 'month', 'week'],
  related: ['SegmentedControl', 'LeaderboardList'],
} satisfies ComponentMeta
