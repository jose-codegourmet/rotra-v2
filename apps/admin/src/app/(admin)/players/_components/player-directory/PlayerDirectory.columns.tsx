import type { AdminPlayer } from '@rotra/data/admin-player/types'
import { AdminPlayerClubs } from '@rotra/ui/admin-player-clubs'
import { Checkbox } from '@rotra/ui/checkbox'
import type { DataTableProps } from '@rotra/ui/data-table'
import { PlayerAccountChip } from '@rotra/ui/player-account-chip'
import { RankStatusChip } from '@rotra/ui/rank-status-chip'
import type { ReactNode } from 'react'

/**
 * A-PLAYERS columns; `hrefOf` gives each player's detail URL (carrying the directory's search, filter
 * and shown count) and `clubNameOf` the name of the club that created the identity ('—' when no club
 * record exists). The prototype's directory has no sorting, so no header turns into a sort button.
 */
export function playerDirectoryColumns(
  hrefOf: (player: AdminPlayer) => string,
  clubNameOf: (clubId: string | null) => string,
  onOpen?: (id: string) => void,
  actions?: (player: AdminPlayer) => ReactNode,
  selected: string[] = [],
  onSelect?: (id: string, checked: boolean) => void,
): DataTableProps<AdminPlayer>['columns'] {
  return [
    {
      id: 'select',
      header: 'Select',
      enableSorting: false,
      cell: ({ row }) => (
        <Checkbox
          variant="compact"
          label={`Select ${row.original.name}`}
          checked={selected.includes(row.original.id)}
          onChange={(checked) => onSelect?.(row.original.id, checked)}
        />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => actions?.(row.original),
    },
    {
      id: 'player',
      enableSorting: false,
      header: 'Player',
      meta: { lead: true },
      cell: ({ row }) => (
        <a
          href={hrefOf(row.original)}
          onClick={(e) => {
            if (onOpen && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
              e.preventDefault()
              onOpen(row.original.id)
            }
          }}
        >
          {row.original.name}
          {row.original.nickname ? ` “${row.original.nickname}”` : ''}
        </a>
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
      id: 'clubs',
      header: 'Clubs',
      enableSorting: false,
      cell: ({ row }) => <AdminPlayerClubs clubs={row.original.clubs} />,
    },
    { id: 'added', header: 'Added', enableSorting: false, cell: ({ row }) => row.original.addedOn },
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
