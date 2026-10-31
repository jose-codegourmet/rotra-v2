import type { ComponentMeta } from '@rotra/ui/meta'

export const breadcrumbMeta = {
  name: 'Breadcrumb',
  description: 'The small "‹ Home" back link above a page title that returns to the parent screen.',
  usage: [
    'Use on secondary screens (Saved players, Venues, Inventory, Admin detail pages); label it with where it goes.',
    'Pass href with linkAs={Link} in apps, or onClick.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Saved players / Venues › .crumb; rotra-admin.html › .back',
  },
  docs: ['docs/screens/product/navigation.md'],
  related: ['PageHeader'],
} satisfies ComponentMeta
