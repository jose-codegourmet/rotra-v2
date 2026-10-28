import type { ComponentMeta } from '@rotra/ui/meta'

export const topBarMeta = {
  name: 'TopBar',
  description:
    'The sticky top bar: menu button (inside AppShell), the ROTRA mark with the product name, and the right-side actions such as SyncStatus and ThemeToggle.',
  usage: [
    'Admin uses brandHref with linkAs for its clubs link and menuOnNarrowOnly for a permanent desktop rail.',
    "Pass it as AppShell's topBar. Outside a shell (sign-in, public pages) it shows no menu button.",
    'The product name hides on phones ≤ 480 px, as the prototype drops "Queue".',
    'Admin and Player pass onBrandClick to go home from the mark.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Top bar (.top, .brand, .burger)',
  },
  docs: ['docs/screens/product/navigation.md#product-navigation'],
  related: ['AppShell', 'SyncStatus', 'ThemeToggle'],
} satisfies ComponentMeta
