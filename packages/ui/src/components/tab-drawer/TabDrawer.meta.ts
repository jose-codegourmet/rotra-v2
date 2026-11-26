import type { ComponentMeta } from '@rotra/ui/meta'

export const tabDrawerMeta = {
  name: 'TabDrawer',
  description:
    'A phone view picker for the live console: a full-width button with the current view and its chip that opens a left drawer listing every view with its chip.',
  usage: [
    'Normally used through Tabs with phoneMenu="drawer" and drawerTitle; it shows at 640 px and below only.',
    'Only each item\'s first badge shows, as a chip (tone="warn" for one that needs attention). Picking an item calls onChange and closes the drawer.',
    'Escape, the scrim and the × close it and focus returns to the button. Other screens keep the dropdown TabMenu.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › view button and left drawer (consoleViewDrawer, .cv-drawer)',
  },
  docs: ['docs/screens/product/modules/queue/session-console.md'],
  related: ['Tabs', 'TabMenu', 'Sheet'],
} satisfies ComponentMeta
