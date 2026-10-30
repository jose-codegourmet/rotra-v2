import type { AdminContactRequestItem } from '@rotra/data/contact-change-request/types'
import { Button } from '@rotra/ui/button'
import { REQUEST_FIELD_LABEL } from '@rotra/ui/contact-request-status/variants'
import { ContactRequestStatusChip } from '@rotra/ui/contact-request-status-chip'
import type { DataTableProps } from '@rotra/ui/data-table'
import { requestAgo } from '@rotra/ui/name-change-request-card/helpers'
import { PlayerIdentityCell } from '@rotra/ui/player-identity-cell'
import Link from 'next/link'

/**
 * A-CONTACT-REQUESTS columns; `hrefOf` gives each request's review URL (carrying the list's status
 * filter). The prototype's list has no sorting, so no header turns into a sort button.
 */
export function contactRequestColumns(
  hrefOf: (request: AdminContactRequestItem) => string,
): DataTableProps<AdminContactRequestItem>['columns'] {
  return [
    {
      id: 'player',
      enableSorting: false,
      header: 'Player',
      meta: { lead: true },
      cell: ({ row }) => (
        <PlayerIdentityCell
          variant="request"
          fullName={row.original.player.fullName}
          rtrId={row.original.player.rtrId}
        />
      ),
    },
    {
      id: 'change',
      enableSorting: false,
      header: 'Change',
      cell: ({ row }) => (
        <span className="flex flex-col gap-1 [align-items:inherit]">
          <span>{REQUEST_FIELD_LABEL[row.original.field]}</span>
          <span className="font-mono text-[13px] text-fg2 [overflow-wrap:anywhere]">
            → {row.original.toValue}
          </span>
        </span>
      ),
    },
    {
      id: 'sent',
      enableSorting: false,
      header: 'Sent',
      meta: { nowrap: true },
      cell: ({ row }) => (
        <span className="text-[13px]">{requestAgo(new Date(row.original.requestedAt))}</span>
      ),
    },
    {
      id: 'status',
      enableSorting: false,
      header: 'Status',
      cell: ({ row }) => (
        <ContactRequestStatusChip status={row.original.status} conflict={row.original.blocked} />
      ),
    },
    {
      id: 'action',
      enableSorting: false,
      header: '',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <Button asChild size="xs">
          <Link href={hrefOf(row.original)}>{row.original.nextAction}</Link>
        </Button>
      ),
    },
  ]
}
