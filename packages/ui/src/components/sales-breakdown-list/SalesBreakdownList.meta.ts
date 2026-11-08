import type { ComponentMeta } from '@rotra/ui/meta'

export const salesBreakdownListMeta = {
  name: 'SalesBreakdownList',
  description:
    'The three lists under the Sales number cards: Revenue by plan, Recent payments and Most active clubs, each in its own card with a note and an empty message.',
  usage: [
    'Pick the list with `kind`: "plans", "payments" or "clubs". Amounts are integer centavos; ₱0 in Recent payments reads "Free".',
    'Pass `onOpenClub` so the club name opens the club page; without it the name is plain text.',
    'Pass `emptyText` for an empty period, e.g. "No payments were recorded last 7 days."',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'Sales › Revenue by plan, Recent payments, Most active clubs',
  },
  docs: ['docs/screens/product/modules/admin/sales.md'],
  variants: ['plans', 'payments', 'clubs'],
  related: ['SalesStatCard', 'DataTable', 'KeyValueList'],
} satisfies ComponentMeta
