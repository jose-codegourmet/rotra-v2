'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { DataTable } from '@rotra/ui/data-table'
import { EmptyState } from '@rotra/ui/empty-state'
import { levelLabel } from '@rotra/ui/level-pill'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

/** One standings row, already sorted by the standings rules (most wins, fewest losses, head-to-head). */
export type LiveLeaderboardRow = {
  playerId: string
  name: string
  level: PlayingLevel | null
  photoUrl?: string
  wins: number
  losses: number
  /** Counted games: partial (substituted) and invalid games are already left out */
  games: number
}

type LiveLeaderboardBaseProps = {
  /** Pre-sorted standings; the row's index is its rank */
  rows: LiveLeaderboardRow[]
  /** The player's picture opens their profile */
  onOpenProfile: (playerId: string) => void
  className?: string
}

export type LiveLeaderboardProps = LiveLeaderboardBaseProps &
  (
    | {
        /** Tonight's working standings on the console (default) */
        variant?: 'live'
        /** The session's minimum games, shown after the games count as "g/min" */
        minimumGames: number
      }
    | {
        /**
         * The official standings on a session record's Results tab: #, Player, W, L, Games, no
         * heading, no level, no win %
         */
        variant: 'record'
        minimumGames?: never
      }
  )

const column = createColumnHelper<LiveLeaderboardRow>()

/** The prototype's .rank: a 26 px circle; first is filled, second and third are outlined. */
function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        'inline-grid size-[26px] place-items-center rounded-full bg-elev text-xs font-extrabold tabular-nums',
        rank === 1 && 'bg-accent text-on-accent',
        (rank === 2 || rank === 3) &&
          'bg-transparent text-accent shadow-[inset_0_0_0_1.5px_var(--accent)]',
      )}
    >
      {rank}
    </span>
  )
}

/**
 * Tonight's standings on the console's Leaderboard view: rank (top three highlighted), player
 * picture, name and level, wins, losses, games against the minimum, and win %. One labelled card
 * per row on phones. A working view for the operator, never official history.
 *
 * The record variant is the same table on a session record's Results tab (the prototype's
 * histResultsPane()): #, Player (picture button and name), W, L and the counted games, without the
 * heading, the level or the win %.
 */
export function LiveLeaderboard({
  variant = 'live',
  rows,
  minimumGames,
  onOpenProfile,
  className,
}: LiveLeaderboardProps) {
  const record = variant === 'record'
  const columns = useMemo(
    () => [
      column.display({
        id: 'rank',
        header: '#',
        enableSorting: false,
        meta: { align: 'right', nowrap: true, cardLabel: 'Rank' },
        cell: ({ row }) => <RankBadge rank={row.index + 1} />,
      }),
      column.accessor('name', {
        header: 'Player',
        enableSorting: false,
        meta: { lead: true },
        cell: ({ row }) =>
          record ? (
            <span className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => onOpenProfile(row.original.playerId)}
                aria-label={`${row.original.name}. View profile`}
                title={row.original.name}
                className="m-0 flex-none rounded-full border-0 bg-transparent p-0 leading-none [&>span]:hover:shadow-[0_0_0_2px_var(--accent)]"
              >
                <Avatar name={row.original.name} src={row.original.photoUrl} size={36} />
              </button>
              <b className="min-w-0 [overflow-wrap:anywhere]">{row.original.name}</b>
            </span>
          ) : (
            <span className="flex min-w-0 items-center gap-2.5">
              <Avatar
                name={row.original.name}
                src={row.original.photoUrl}
                size={36}
                onClick={() => onOpenProfile(row.original.playerId)}
              />
              <span className="min-w-0">
                <b className="block [overflow-wrap:anywhere]">{row.original.name}</b>
                <span className="block text-[13px] text-fg2">{levelLabel(row.original.level)}</span>
              </span>
            </span>
          ),
      }),
      column.accessor('wins', {
        header: 'W',
        enableSorting: false,
        meta: { align: 'right', nowrap: true, cardLabel: 'Wins' },
        cell: ({ getValue }) => <b className="tabular-nums">{getValue()}</b>,
      }),
      column.accessor('losses', {
        header: 'L',
        enableSorting: false,
        meta: { align: 'right', nowrap: true, cardLabel: 'Losses' },
        cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
      }),
      column.accessor('games', {
        header: 'Games',
        enableSorting: false,
        meta: { align: 'right', nowrap: true },
        cell: ({ getValue }) =>
          record ? (
            <span className="tabular-nums">{getValue()}</span>
          ) : (
            <span className="tabular-nums">
              {getValue()}
              <span className="text-fg2">/{minimumGames}</span>
            </span>
          ),
      }),
      ...(record
        ? []
        : [
            column.display({
              id: 'winRate',
              header: 'Win %',
              enableSorting: false,
              meta: { align: 'right', nowrap: true },
              cell: ({ row }) => (
                <span className="tabular-nums">
                  {row.original.games
                    ? Math.round((row.original.wins / row.original.games) * 100)
                    : 0}
                  %
                </span>
              ),
            }),
          ]),
    ],
    [record, minimumGames, onOpenProfile],
  )

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {record ? null : (
        <div>
          <h2 className="text-lg font-bold">Leaderboard</h2>
          <p className="mt-1 text-[13px] text-fg2">
            Tonight's standings from completed games: most wins, then fewest losses, then
            head-to-head. It updates each time you confirm a result. Partial and invalid games don't
            count.
          </p>
        </div>
      )}
      {rows.length ? (
        <Card padding="none" className="overflow-hidden px-1.5 max-[760px]:px-4">
          <DataTable
            aria-label={record ? 'Standings' : "Tonight's standings"}
            columns={columns}
            data={rows}
            getRowId={(row) => row.playerId}
            rowClassName={(_, index) =>
              index < 3 ? 'bg-accent-subtle/50 [&>td]:bg-accent-subtle/50' : undefined
            }
          />
        </Card>
      ) : (
        <Card>
          <EmptyState>
            {record
              ? 'No counted games were recorded in this session.'
              : 'No completed games yet. Standings appear after the first confirmed result.'}
          </EmptyState>
        </Card>
      )}
    </div>
  )
}
