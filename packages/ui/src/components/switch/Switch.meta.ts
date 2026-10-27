import type { ComponentMeta } from '@rotra/ui/meta'

export const switchMeta = {
  name: 'Switch',
  description:
    'An on/off switch, used for player presence (Present), session formats and settings that apply at once.',
  usage: [
    'Always pass aria-label naming what it controls, e.g. "Present: Miguel Santos".',
    'With React Hook Form pass checked={field.value} and onChange={field.onChange}.',
    'Touch screens get the 54 × 32 px Present size automatically.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Roster › Present switch; Session setup › formats (.switch)',
  },
  docs: ['docs/screens/product/experience-contract.md#layout-and-device-behavior'],
  related: ['Checkbox'],
} satisfies ComponentMeta
