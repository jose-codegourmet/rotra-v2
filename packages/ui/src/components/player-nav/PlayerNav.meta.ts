import type { ComponentMeta } from '@rotra/ui/meta'

export const playerNavMeta = {
  name: 'PlayerNav',
  description:
    'Player Information navigation for the leaderboard, sign-in, and the signed-in player’s Queue Session, profile and Settings.',
  usage: [
    'Place beside the Player Information brand in the top bar; it hides at 640 px and narrower.',
    'Render PlayerNavDock outside the top bar for the phone bottom dock (fixed, safe-area padding, plus a spacer so content is not hidden). It is hidden above 640 px.',
    'Pass href targets with linkAs={Link}, or navigation callbacks when a draft needs a discard confirmation.',
    'Pass session with Play, Ready or Next up and a full accessible name. Its link opens the Queue Session in the Queue app.',
    'Pass settings for signed-in players unless their session is live or today.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'topBar() › .nav, .dock' },
  docs: [
    'docs/screens/product/navigation.md#product-navigation',
    'docs/mockup-changes/2026-11-26-player-dock-settings-session.md',
    'docs/mockup-changes/2026-11-26-player-session-button-options.md',
  ],
  variants: ['signed-out', 'signed-in', 'play', 'ready', 'next-up', 'settings-current', 'dock'],
  related: ['TopBar', 'OfflineBand'],
} satisfies ComponentMeta
