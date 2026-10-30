import type { AdminPlayer } from '@rotra/data/admin-player/types'
import type { DataTableProps } from '@rotra/ui/data-table'
import { PlayerAccountChip } from '@rotra/ui/player-account-chip'
import { PlayerIdentityCell } from '@rotra/ui/player-identity-cell'
import { RankStatusChip } from '@rotra/ui/rank-status-chip'
import Link from 'next/link'

/**
 * A-PLAYERS columns; `hrefOf` gives each player's detail URL (carrying the directory's search, filter
 * and shown count) and `clubNameOf` the name of the club that created the identity ('—' when no club
 * record exists). The prototype's directory has no sorting, so no header turns into a sort button.
 */
export function playerDirectoryColumns(
  hrefOf: (player: AdminPlayer) => string,
  clubNameOf: (clubId: string | null) => string,
): DataTableProps<AdminPlayer>['columns'] {
  return [
    {
      id: 'player',
      enableSorting: false,
      header: 'Player',
      meta: { lead: true },
      cell: ({ row }) => (
        <PlayerIdentityCell
          variant="directory"
          fullName={row.original.name}
          nickname={row.original.nickname}
          href={hrefOf(row.original)}
          linkComponent={Link}
        />
      ),
    },
    {
      id: 'rtr-id',
      enableSorting: false,
      header: 'RTR ID',
      meta: { nowrap: true },
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.rtrId}</span>,
    },
    {
      id: 'account',
      enableSorting: false,
      header: 'Account',
      cell: ({ row }) => <PlayerAccountChip claimed={row.original.claimed} />,
    },
    {
      id: 'rank',
      enableSorting: false,
      header: 'Rank',
      cell: ({ row }) => <RankStatusChip status={row.original.rankStatus} />,
    },
    {
      id: 'created-by',
      enableSorting: false,
      header: 'Created by',
      cell: ({ row }) => (
        <span className="text-[13px]">{clubNameOf(row.original.createdByClubId)}</span>
      ),
    },
  ]
}
