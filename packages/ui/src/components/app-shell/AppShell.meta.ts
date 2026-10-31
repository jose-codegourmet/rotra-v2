import type { ComponentMeta } from '@rotra/ui/meta'

export const appShellMeta = {
  name: 'AppShell',
  description:
    'The signed-in operator layout for Queue and Admin: top bar, left navigation rail, optional phone dock, and the page column.',
  usage: [
    'Use contentAs and contentClassName to host the Admin main landmark and prototype page spacing.',
    'Use once in the (operator) route group layout. Pass TopBar, SideRail and (Queue only) BottomDock; nav items come from the app.',
    'The rail collapses to icons on wide screens; pass collapsed and onCollapsedChange to remember it on this device (the prototypes use rotra-queue-nav).',
    'At 900 px and below the rail is a drawer opened by the dock Menu (Queue) or the top bar menu button (Admin). Escape or the scrim closes it.',
    "Only one drawer at a time: close the main drawer before opening a screen's own drawer (Club settings).",
    'Props only: no routing or data inside.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen:
      'Shell › .top, .shell, .rail (.rail-min), .dock, .nav-scrim; rotra-admin.html › .shell, .rail',
  },
  docs: [
    'docs/screens/product/navigation.md#product-navigation',
    'docs/screens/product/experience-contract.md#layout-and-device-behavior',
  ],
  related: ['TopBar', 'SideRail', 'BottomDock', 'SyncStatus', 'PageHeader'],
} satisfies ComponentMeta
