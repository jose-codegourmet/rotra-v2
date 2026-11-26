'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { DataTable } from '@rotra/ui/data-table'
import { EmptyState } from '@rotra/ui/empty-state'
import { levelLabel } from '@rotra/ui/level-pill'
import {
  formatStandingsGames,
  type StandingsFaceBand,
  type StandingsGames,
  StandingsPlayerCell,
  tiedNames,
} from '@rotra/ui/standings-faces'
import { createColumnHelper } from '@tanstack/react-table'
import { type ReactNode, useMemo } from 'react'

/** One player inside a standings position. */
export type LiveLeaderboardPlayer = {
  playerId: string
  name: string
  level: PlayingLevel | null
  photoUrl?: string
}

/**
 * One standings row: a position and the players who hold it. Players with the same wins and losses
 * share one row (1, 1, 2); the caller computes the position and orders the players inside it.
 */
export type LiveLeaderboardRow = {
  /** The shared position number: 1, 1, 2 */
  position: number
  /** One or more players, in the order their names and faces show */
  players: LiveLeaderboardPlayer[]
  /** Shared by every player in the row */
  wins: number
  losses: number
  /**
   * Counted games: partial (substituted) and invalid games are already left out. A number, or
   * {min, max} when the players inside the position counted different games (shown "5–6").
   */
  games: StandingsGames
}

type LiveLeaderboardBaseProps = {
  /** Standings already grouped into positions, best first */
  rows: LiveLeaderboardRow[]
  /** The player's picture opens their profile */
  onOpenProfile: (playerId: string) => void
  /** The session's TopThreePodium, between the copy and the table (D-2026-11-25-04) */
  podium?: ReactNode
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

/** "intermediate_mid" → "intermediate"; no level → "none" (grey ring). */
const bandOf = (level: PlayingLevel | null): StandingsFaceBand =>
  level ? (level.split('_')[0] as StandingsFaceBand) : 'none'

const profileLabelOf = (name: string) => `${name}. View profile`

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
 * Tonight's standings on the console's Leaderboard view: position (top three highlighted), player
 * faces (stacked when a position is shared), names and levels, wins, losses, games against the minimum, and win %. One labelled card
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
  podium,
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
        cell: ({ row }) => <RankBadge rank={row.original.position} />,
      }),
      column.display({
        id: 'player',
        header: 'Player',
        enableSorting: false,
        meta: { lead: true },
        cell: ({ row }) => {
          const { players } = row.original
          const levels = [...new Set(players.map((p) => levelLabel(p.level)))]
          return (
            <StandingsPlayerCell
              faces={players.map((p) => ({
                id: p.playerId,
                name: p.name,
                pictureUrl: p.photoUrl,
                band: record ? undefined : bandOf(p.level),
                onOpen: () => onOpenProfile(p.playerId),
              }))}
              profileLabel={record ? profileLabelOf : undefined}
              names={<b>{tiedNames(players.map((p) => p.name))}</b>}
              detail={
                record ? undefined : (
                  <span className="block text-[13px] text-fg2">{levels.join(', ')}</span>
                )
              }
            />
          )
        },
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
            <span className="tabular-nums">{formatStandingsGames(getValue())}</span>
          ) : (
            <span className="tabular-nums">
              {formatStandingsGames(getValue())}
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
                  {row.original.wins + row.original.losses
                    ? Math.round(
                        (row.original.wins / (row.original.wins + row.original.losses)) * 100,
                      )
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
            Tonight's standings from completed games: most wins, then fewest losses. Players with
            the same wins and losses share a position. It updates each time you confirm a result.
            Partial and invalid games don't count, unless you gave a substitute the game.
          </p>
        </div>
      )}
      {podium}
      {rows.length ? (
        <Card padding="none" className="overflow-hidden px-1.5 max-[760px]:px-4">
          <DataTable
            aria-label={record ? 'Standings' : "Tonight's standings"}
            columns={columns}
            data={rows}
            getRowId={(row) => `${row.position}-${row.players[0]?.playerId ?? ''}`}
            rowClassName={(row) =>
              row.position <= 3 ? 'bg-accent-subtle/50 [&>td]:bg-accent-subtle/50' : undefined
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
