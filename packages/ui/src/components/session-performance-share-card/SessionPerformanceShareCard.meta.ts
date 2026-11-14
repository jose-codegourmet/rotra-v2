import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionPerformanceShareCardMeta = {
  name: 'SessionPerformanceShareCard',
  description:
    'Share performance: your night in one card (record big, win rate, Games, Won, Lost and Standing once published) at Story, Facebook post and Square sizes. Square is top-aligned; Story and Facebook post centre the content and set it larger (the prototype .sh-card rules).',
  usage: [
    'Put it inside a ShareDialog titled “Share performance”.',
    '`wins` and `losses` are counted singles and doubles; `games` is every game played that night.',
    'Pass `position` only once the club has published the Standings; Share performance itself is available before (D-2026-11-13-06).',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Share dialog › Share performance (shareModel perf)',
  },
  docs: [
    'docs/mockup-changes/2026-11-13-player-game-row-court.md',
    'docs/mockup-changes/2026-11-13-player-share-cards-fill.md',
  ],
  related: ['ShareDialog', 'ShareImagePicker', 'SessionResultShareCard'],
} satisfies ComponentMeta
