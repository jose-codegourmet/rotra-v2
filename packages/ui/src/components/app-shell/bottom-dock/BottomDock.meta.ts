import type { ComponentMeta } from '@rotra/ui/meta'

export const bottomDockMeta = {
  name: 'BottomDock',
  description:
    'The Queue phone dock (900 px and below): Menu, the highlighted main session action, and Settings, within thumb reach.',
  usage: [
    "Queue only. Pass it as AppShell's dock; Menu opens the navigation drawer.",
    "main is the screen's one session action: Create session, Continue session, Start session or Session done. When the dock shows it, hide the page's own bottom bar button on phones.",
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Phone dock (.dock, .dock-btn, .dock-main)',
  },
  docs: ['docs/screens/product/navigation.md#product-navigation'],
  related: ['AppShell', 'SideRail'],
} satisfies ComponentMeta
