import type { ComponentMeta } from '@rotra/ui/meta'

export const weeklyPerformanceChartMeta = {
  name: 'WeeklyPerformanceChart',
  description:
    'The “YEAR Weekly Performance” card groups four summary figures and a won/lost split in one responsive box. Each weekday shows the win rate over side-by-side win and loss bars.',
  usage: [
    'Pass seven days, Sunday first, of counted singles and doubles this calendar year (`weeklyPerformance` in @rotra/data/player/rules); fun and partial games never count.',
    'Games page: pass `filter` and `onFilterChange`; tapping a green bar filters that weekday’s wins, a red bar its losses; tapping again or Clear passes null.',
    'Profile: `readOnly` (bars are not buttons) with `onSeeAllGames`, and on your own profile `visibility={<WeeklyVisibilityChip …/>}`: Public, Signed-in players, Only you or Hidden (Show my weekly performance off), a button that opens Privacy and contact at that switch.',
    'The summary uses a two-by-two grid and abbreviated best weekday when the box is narrow.',
    'Renders nothing when there are no counted games. Every bar carries its count and an accessible name; colour is never the only signal.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Games, Profile and Home › Weekly performance (weeklyPerf, .wp*)',
  },
  docs: [
    'docs/mockup-changes/2026-11-13-player-weekly-performance.md',
    'docs/mockup-changes/2026-11-26-player-weekly-summary-box.md',
    'docs/mockup-changes/2026-11-13-player-stats-visibility.md',
  ],
  variants: ['interactive', 'readOnly'],
  related: ['MatchHistory', 'BarChart'],
} satisfies ComponentMeta
