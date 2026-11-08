import type { ComponentMeta } from '@rotra/ui/meta'

export const clubSalesTableMeta = {
  name: 'ClubSalesTable',
  description:
    'A club’s Sales tab: what the club paid ROTRA against how much it used ROTRA. Three summary numbers, a month-by-month table and a bar chart of the amount paid each month.',
  usage: [
    'Pass one row per month, oldest first, with amounts in integer centavos. Paid per session, totals and Left over are worked out from them.',
    'Set `free` for a tester club whose licenses are recorded at ₱0.',
    'The estimated cost per session is a placeholder until the owner sets it; the component says so in its note.',
    'On phones (≤ 760 px) the table becomes one card per month.',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'Club page › Sales tab (/admin/clubs/c1?tab=sales)',
  },
  docs: ['docs/screens/product/modules/admin/clubs-licenses.md'],
  related: ['SalesStatCard', 'BarChart', 'DataTable'],
} satisfies ComponentMeta
