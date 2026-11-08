import type { ComponentMeta } from '@rotra/ui/meta'

export const barChartMeta = {
  name: 'BarChart',
  description:
    'A plain bar chart drawn with SVG or CSS in the accent colour: a small one for Sales number cards and a labelled one for a club’s month-by-month payments.',
  usage: [
    'Use variant "spark" inside a SalesStatCard: no labels, the newest bar at full strength, hover shows the value.',
    'Use variant "labeled" when each bar needs a short label under it, such as a month.',
    'Pass every bar’s value as text too (valueLabel) so the chart can describe itself; a chart never relies on colour alone.',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'Sales › number cards (.sl-chart); Club page › Sales tab (.sl-bars)',
  },
  docs: [
    'docs/screens/product/modules/admin/sales.md',
    'docs/screens/product/modules/admin/clubs-licenses.md',
  ],
  variants: ['spark', 'labeled'],
  related: ['SalesStatCard', 'ClubSalesTable'],
} satisfies ComponentMeta
