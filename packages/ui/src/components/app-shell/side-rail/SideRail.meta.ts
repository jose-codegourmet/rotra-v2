import type { ComponentMeta } from '@rotra/ui/meta'

export const sideRailMeta = {
  name: 'SideRail',
  description:
    'The left navigation of the operator shell: icon and label links with counts, the live session highlighted, optional group headings and a footer.',
  usage: [
    "Pass it as AppShell's rail. Items come from the app (navigation.md); mark the current page with current.",
    'Use href with linkAs={Link} for routes, or onSelect for actions such as opening Inventory.',
    'Admin uses group labels ("Requests", "Settings"), hot counts for waiting requests, and a footer with "Signed in as" and Sign out.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen:
      'Shell › .rail, .rail-link (.on, .is-live, .count); rotra-admin.html › .rail-label, .rail-end',
  },
  docs: ['docs/screens/product/navigation.md#product-navigation'],
  related: ['AppShell', 'BottomDock'],
} satisfies ComponentMeta
