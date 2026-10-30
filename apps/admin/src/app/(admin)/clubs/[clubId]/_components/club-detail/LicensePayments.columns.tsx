import { formatAmount } from '@rotra/data/club/rules'
import { formatLicenseDate } from '@rotra/data/license/rules'
import type { ClubLicenseTerm } from '@rotra/data/license/types'
import type { DataTableProps } from '@rotra/ui/data-table'

/**
 * Club detail › License › Payment history (rotra-admin.html viewClub terms table). Rows come newest
 * first from the fetcher; the prototype has no sorting, so no header turns into a sort button.
 */
export const licensePaymentColumns: DataTableProps<ClubLicenseTerm>['columns'] = [
  {
    id: 'paid',
    accessorFn: (term) => (term.paidOn ? formatLicenseDate(term.paidOn) : '—'),
    enableSorting: false,
    header: 'Paid',
    meta: { nowrap: true },
  },
  {
    id: 'plan',
    accessorFn: (term) => term.plan,
    enableSorting: false,
    header: 'Plan',
  },
  {
    id: 'covers',
    enableSorting: false,
    header: 'Covers',
    cell: ({ row }) => (
      <span className="text-[13px]">
        {formatLicenseDate(row.original.startsAt)} – {formatLicenseDate(row.original.endsAt)}
      </span>
    ),
  },
  {
    id: 'amount',
    accessorFn: (term) => formatAmount(term.amountMinor),
    enableSorting: false,
    header: 'Amount',
    meta: { align: 'right' },
  },
  {
    id: 'reference',
    enableSorting: false,
    header: 'Reference',
    cell: ({ row }) => (
      <span className="font-mono text-[13px]">{row.original.paymentReference || '—'}</span>
    ),
  },
]
