import type { ComponentMeta } from '@rotra/ui/meta'

export const tickTileMeta = {
  name: 'TickTile',
  description:
    'A multi-select tile: a tick box and a label. Ticked is an accent box with a check, an accent border and a light tint; unticked is grey.',
  usage: [
    'Controlled: pass checked and onChange(next). Renders a button with role="checkbox" and aria-checked.',
    'Lay several out in a grid inside a role="group" with an aria-label (Players can request: 2 v 2, 1 v 1, 1 v 2, 3 v 3, 4 v 4, 5 v 5).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-SETUP step 2 › Players can request (.fmt-ticks / .fmt-tick)',
  },
  docs: ['docs/mockup-changes/2026-11-19-queue-request-format-ticks.md'],
  related: ['Checkbox', 'SetupFormatsSection'],
} satisfies ComponentMeta
