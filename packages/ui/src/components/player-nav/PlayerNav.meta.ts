import type { ComponentMeta } from '@rotra/ui/meta'

export const playerNavMeta = {
  name: 'PlayerNav',
  description:
    "The Player Information top-bar navigation for the overall leaderboard and either sign-in or the registered player's profile.",
  usage: [
    'Place beside the Player Information brand in the top bar; it hides at 640 px and narrower.',
    'Render PlayerNavDock outside the top bar for the phone bottom dock (fixed, safe-area padding, plus a spacer so content is not hidden). It is hidden above 640 px.',
    'Pass href targets with linkAs={Link}, or navigation callbacks when the host owns navigation.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'topBar() › .nav, .dock' },
  docs: [
    'docs/screens/product/navigation.md#product-navigation',
    'docs/mockup-changes/2026-11-19-player-mobile-dock.md',
  ],
  variants: ['signed-out', 'signed-in', 'dock'],
  related: ['TopBar', 'OfflineBand'],
} satisfies ComponentMeta
