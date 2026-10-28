import type { ComponentMeta } from '@rotra/ui/meta'

export const operatorShellMeta = {
  name: 'OperatorShell',
  description:
    'The signed-in Queue layout: AppShell with the top bar (sync pill from useSyncState, theme switch, dev menu), the left nav with Saved players / Venues counts and the Live session item, and the phone dock whose centre pill a page can override through useDockAction.',
  usage: [
    'Rendered once by app/(operator)/layout.tsx. Pages call useDockAction to set Session done / Start session; otherwise the pill is Continue session while live, else Create session.',
    'The collapsed rail is remembered per device under localStorage "rotra-queue-nav".',
    'Inventory is not in the nav until its route exists (Queue › Financials).',
    "The finishing route (/sessions/[sessionId]/finishing) renders bare: no top bar, left nav or dock, as the prototype hides its shell on the finalizing screen; the pathname rule sits beside the license gate's.",
  ],
  docs: ['docs/screens/product/modules/queue/access-home.md', 'docs/screens/product/navigation.md'],
  related: ['AppShell', 'TopBar', 'SideRail', 'BottomDock', 'SyncStatus'],
} satisfies ComponentMeta
