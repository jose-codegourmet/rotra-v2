import type { ComponentMeta } from '@rotra/ui/meta'
export const devMenuMeta = {
  name: 'DevMenu',
  description:
    'Presentational prototype controls for offline, license expiry, save failure and conflict.',
  usage: ['Mount only in development or with the explicit developer-menu build flag.'],
  prototype: { file: 'docs/frames/queue-app/rotra-queue.html', screen: 'Prototype controls' },
  variants: ['default', 'offline', 'expired', 'save-failure', 'conflict'],
  related: ['Sheet', 'Switch'],
} satisfies ComponentMeta
