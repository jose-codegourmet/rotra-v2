import type { ComponentMeta } from '@rotra/ui/meta'
export const playerShellMeta = {
  name: 'PlayerShell',
  description: 'Wires Player Information navigation, theme, prototype controls and offline status.',
  usage: [
    'Supports registration context and email confirmation states.',
    'Mount once inside AppProviders in the root layout.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'topBar' },
  docs: ['docs/screens/product/navigation.md'],
  related: ['TopBar', 'PlayerNav', 'OfflineBand'],
} satisfies ComponentMeta
