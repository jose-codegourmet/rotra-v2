import type { ComponentMeta } from '@rotra/ui/meta'

export const iconMeta = {
  name: 'Icon',
  description:
    'One of the line icons the prototypes draw inline (navigation, sun and moon, alerts, close, back, calendar, …), at the size the prototype uses.',
  usage: [
    'Use inside buttons, notices, rail links and chips instead of pasting SVG.',
    'Decorative by default: the button or link around it carries the accessible name.',
    'Need an icon the prototypes do not have? Ask first; do not add an icon library.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Script › const I (icon set); also rotra-player.html and rotra-admin.html',
  },
  related: ['IconButton', 'Button'],
} satisfies ComponentMeta
