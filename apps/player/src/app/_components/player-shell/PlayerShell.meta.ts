import type { ComponentMeta } from '@rotra/ui/meta'
export const playerShellMeta = {
  name: 'PlayerShell', description: 'Wires Player Information navigation, theme, prototype controls and offline status.',
  usage: ['Mount once inside AppProviders in the root layout.'],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'topBar' },
  docs: ['docs/screens/product/navigation.md'], related: ['TopBar', 'PlayerNav', 'OfflineBand'],
} satisfies ComponentMeta
