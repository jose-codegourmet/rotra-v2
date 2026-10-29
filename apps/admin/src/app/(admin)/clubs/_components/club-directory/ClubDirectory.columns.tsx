import type { AdminClubListItem } from '@rotra/data/club/types'
import type { ClubAccessState } from '@rotra/data/license/types'
import { ClubCell } from '@rotra/ui/club-cell'
import { ClubPriceTag } from '@rotra/ui/club-price-tag'
import type { DataTableProps } from '@rotra/ui/data-table'
import { LicenseAccessChip } from '@rotra/ui/license-access-chip'
import { formatYmd } from '@rotra/ui/license-access-chip/variants'
import Link from 'next/link'

/** rotra-admin.html viewClubs() Until cell. */
function untilLabel(access: ClubAccessState): string {
  switch (access.state) {
    case 'active':
      return formatYmd(access.until)
    case 'expired':
      return `Ended ${formatYmd(access.ended)}`
    case 'scheduled':
      return `From ${formatYmd(access.starts)}`
    case 'none':
      return '—'
  }
}

/**
 * A-CLUBS columns; `hrefOf` gives each club's detail URL (carrying the directory's search and filter).
 * The prototype's directory has no sorting, so no header turns into a sort button.
 */
export function clubDirectoryColumns(
  hrefOf: (club: AdminClubListItem) => string,
): DataTableProps<AdminClubListItem>['columns'] {
  return [
    {
      id: 'club',
      enableSorting: false,
      header: 'Club',
      meta: { lead: true },
      cell: ({ row }) => (
        <ClubCell
          name={row.original.name}
          initials={row.original.initials}
          logoUrl={row.original.logoUrl}
          accent={row.original.accent}
          username={row.original.username}
          runningSessionTitle={row.original.runningSessionTitle}
          hasNameRequest={row.original.nameRequest !== null}
          href={hrefOf(row.original)}
          linkComponent={Link}
        />
      ),
    },
    {
      id: 'founded-in',
      enableSorting: false,
      header: 'Founded in',
      cell: ({ row }) => (
        <>
          {row.original.city}{' '}
          <span className="font-mono text-xs text-fg2">{row.original.cityCode}</span>
        </>
      ),
    },
    {
      id: 'price',
      enableSorting: false,
      header: 'Price',
      meta: { nowrap: true },
      cell: ({ row }) => (
        <ClubPriceTag
          pricing={row.original.licensePricing}
          monthlyMinor={row.original.licenseMonthlyMinor}
        />
      ),
    },
    {
      id: 'plan',
      accessorFn: (club) => (club.access.state === 'none' ? '—' : club.access.plan),
      enableSorting: false,
      header: 'Plan',
    },
    {
      id: 'access',
      enableSorting: false,
      header: 'Access',
      cell: ({ row }) => <LicenseAccessChip access={row.original.access} />,
    },
    {
      id: 'until',
      accessorFn: (club) => untilLabel(club.access),
      enableSorting: false,
      header: 'Until',
      meta: { nowrap: true },
    },
  ]
}
