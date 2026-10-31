import type { ComponentMeta } from '@rotra/ui/meta'

export const pageHeaderMeta = {
  name: 'PageHeader',
  description:
    "A page's title with its description, an optional label row above, and the page's action buttons.",
  usage: [
    "One per page, directly under the Breadcrumb if there is one. The title is the page's only h1.",
    'Put page-level buttons in actions; on phones they become a two-column grid so nothing scrolls sideways.',
    'Use eyebrow for the live console\'s "Live session" label and state chips.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen:
      'Clubs and licenses › .page-head; rotra-queue.html › live console header (.between, .acts)',
  },
  docs: ['docs/screens/product/experience-contract.md#layout-and-device-behavior'],
  related: ['Breadcrumb', 'Button'],
} satisfies ComponentMeta
