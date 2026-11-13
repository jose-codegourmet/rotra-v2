import type { ComponentMeta } from '@rotra/ui/meta'

export const weeklyPerformanceChartMeta = {
  name: 'WeeklyPerformanceChart',
  description:
    'The “YEAR Weekly Performance” card: summary tiles and, per weekday Sunday to Saturday, the win rate over side-by-side win and loss bars. CSS bars, no chart library.',
  usage: [
    'Pass seven days, Sunday first, of counted singles and doubles this calendar year (`weeklyPerformance` in @rotra/data/player/rules); fun and partial games never count.',
    'Games page: pass `filter` and `onFilterChange`; tapping a green bar filters that weekday’s wins, a red bar its losses; tapping again or Clear passes null.',
    'Profile: `readOnly` (bars are not buttons) with `onSeeAllGames`, and on your own profile the visibility chip in `visibility`.',
    'Renders nothing when there are no counted games. Every bar carries its count and an accessible name; colour is never the only signal.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Games and Profile › Weekly performance (weeklyPerf, .wp*)',
  },
  docs: ['docs/mockup-changes/2026-11-13-player-weekly-performance.md'],
  variants: ['interactive', 'readOnly'],
  related: ['MatchHistory', 'BarChart'],
} satisfies ComponentMeta
