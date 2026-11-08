import type { ComponentMeta } from '@rotra/ui/meta'

export const platformSalesMeta = {
  name: 'PlatformSales',
  description:
    'A-SALES container: usePlatformSales for the chosen period, a SegmentedControl (Last 7 days, Last 30 days, Last 12 months), three SalesStatCards (Revenue, Sessions started, Matches played) and the Revenue by plan, Recent payments and Most active clubs lists.',
  usage: [
    'Rendered by /sales. The period is local state, Last 30 days first; switching it refetches and keeps the previous figures on screen meanwhile.',
    'Data money is integer centavos; the data SalesChange maps to the UI one (change > 0 up, < 0 down, 0 same, new, no-history, no-change → same).',
    'Club names in Recent payments and Most active clubs open /clubs/{id}.',
    'Loading: grey bars (also sales/loading.tsx). A failed read shows ErrorState with Retry; a permission error replaces the workspace with the access denial (useDenyOnPermissionError). Empty periods say what is missing inside each list.',
  ],
  docs: ['docs/screens/product/modules/admin/sales.md'],
  related: ['PageHeader', 'SegmentedControl', 'SalesStatCard', 'BarChart', 'SalesBreakdownList'],
} satisfies ComponentMeta
