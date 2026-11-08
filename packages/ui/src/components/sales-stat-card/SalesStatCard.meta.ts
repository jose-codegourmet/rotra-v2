import type { ComponentMeta } from '@rotra/ui/meta'

export const salesStatCardMeta = {
  name: 'SalesStatCard',
  description:
    'A number card for the Sales page: the total for the period, a chip comparing it with the period before, and a small bar chart. The club Sales tab uses it without a chart for its summary numbers.',
  usage: [
    'Use for Revenue, Sessions started and Matches played on Sales, and for Paid to ROTRA, Sessions started and Paid per session on a club’s Sales tab.',
    'Pass the value already formatted. Pass `change` for the comparison chip; omit it where there is nothing to compare.',
    'Pass `bars` for the period chart or `note` for a muted line under the value.',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'Sales › number cards (.sl-kpi); Club page › Sales tab summary',
  },
  docs: [
    'docs/screens/product/modules/admin/sales.md',
    'docs/screens/product/modules/admin/clubs-licenses.md',
  ],
  related: ['BarChart', 'Chip', 'Card'],
} satisfies ComponentMeta
