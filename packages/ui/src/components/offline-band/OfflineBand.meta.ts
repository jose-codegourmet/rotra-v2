import type { ComponentMeta } from '@rotra/ui/meta'

export const offlineBandMeta = {
  name: 'OfflineBand',
  description:
    'A full-width Player Information status band that says this device is showing saved data while it is offline.',
  usage: [
    'Render directly below the Player Information top bar while the app is offline.',
    'Use Notice for content-level messages rather than this global connection state.',
  ],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'topBar() › .band-off' },
  docs: ['docs/screens/product/experience-contract.md#standard-states'],
  related: ['PlayerNav', 'Notice'],
} satisfies ComponentMeta
