'use client'

import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import {
  formatStandingsGames,
  type StandingsGames,
  StandingsPlayerCell,
} from '@rotra/ui/standings-faces'
import { type ReactNode, useRef } from 'react'

/** One player inside a standings position. */
export type SessionStandingsPlayer = {
  id: string
  /** Per the page's name rule */
  name: string
  pictureUrl?: string | null
  /** The signed-in viewer: the row is tinted and the name reads "NAME (you)" */
  isViewer?: boolean
  /** Opens the profile card; without it the face is plain */
  onOpen?: () => void
}

/**
 * One standings row: a position and the players who hold it (same wins and losses share a position,
 * numbered 1, 1, 2). The caller computes the position and orders the players inside it.
 */
export type SessionStandingsRow = {
  id: string
  position: number
  players: SessionStandingsPlayer[]
  wins: number
  losses: number
  /** One number, or {min, max} when the players inside the position counted different games */
  games: StandingsGames
}

export type SessionStandingsProps = {
  rows: SessionStandingsRow[]
  /** The signed-in viewer for the Your position card; null (a visitor) shows no card */
  viewer: { name: string; pictureUrl?: string | null } | null
  /** Your position › Share: the system share sheet with “I finished #N of M …” */
  onShareFinish: () => void
  onShareLeaderboard: () => void
  /** The session's TopThreePodium, between the players count and the table (D-2026-11-25-04) */
  podium?: ReactNode
}

const flash = (row: HTMLElement) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  for (const cell of row.querySelectorAll('td'))
    cell.animate(
      [
        { backgroundColor: 'color-mix(in srgb, var(--accent) 35%, transparent)', offset: 0 },
        { backgroundColor: 'color-mix(in srgb, var(--accent) 35%, transparent)', offset: 0.3 },
        { backgroundColor: 'var(--accent-subtle)', offset: 1 },
      ],
      { duration: 1600, easing: 'ease-out' },
    )
}

/**
 * Finished session page › **Leaderboard** tab (2026-11-13-queue-finished-session-page; the
 * prototype's pubLeaderboard), shown only once the club shares the Standings: the **Your position**
 * card (picture, “#N of M · tied with 2 others”, W, L and games; the card scrolls to your row and flashes it; Share), the
 * players count with **Share leaderboard**, the standings table (#, faces and names, W, L, G; one row per position, stacked faces when players
 * share it; the row holding you tinted with “(you)”), and the order rule.
 */
export function SessionStandings({
  rows,
  viewer,
  onShareFinish,
  onShareLeaderboard,
  podium,
}: SessionStandingsProps) {
  const mineRef = useRef<HTMLTableRowElement>(null)
  const mine = rows.find((row) => row.players.some((player) => player.isViewer))
  const playerCount = rows.reduce((total, row) => total + row.players.length, 0)
  const tiedWith = mine ? mine.players.length - 1 : 0
  const tiedLabel = tiedWith ? `tied with ${tiedWith} ${tiedWith === 1 ? 'other' : 'others'}` : ''
  const record = (row: SessionStandingsRow) => (
    <span className="flex gap-3.5 text-[13px] text-fg2">
      <span>
        <b className="mr-0.5 text-lg text-fg tabular-nums">{row.wins}</b> W
      </span>
      <span>
        <b className="mr-0.5 text-lg text-fg tabular-nums">{row.losses}</b> L
      </span>
      <span>
        <b className="mr-0.5 text-lg text-fg tabular-nums">{formatStandingsGames(row.games)}</b>{' '}
        games
      </span>
    </span>
  )
  const goToMine = () => {
    const row = mineRef.current
    if (!row) return
    row.scrollIntoView({ block: 'center', behavior: 'smooth' })
    flash(row)
  }
  const cardClass =
    'flex flex-wrap items-center justify-between gap-3.5 rounded-lg border border-accent/45 bg-accent-subtle px-4 py-3.5'
  return (
    <section aria-label="Leaderboard" className="flex flex-col gap-3">
      {viewer && mine ? (
        // biome-ignore lint/a11y/useSemanticElements: the card holds its own Share button, so it cannot be a button element.
        <div
          role="button"
          tabIndex={0}
          aria-label={`Your position, number ${mine.position} of ${playerCount}${tiedLabel ? `, ${tiedLabel}` : ''}. Go to your row`}
          onClick={goToMine}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              goToMine()
            }
          }}
          className={cn(
            cardClass,
            'cursor-pointer hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          )}
        >
          <Avatar
            name={viewer.name}
            src={viewer.pictureUrl ?? undefined}
            size={52}
            className="size-12 text-base ring-2 ring-accent ring-offset-2 ring-offset-surface"
          />
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2">
            <span className="w-full text-[11px] font-bold tracking-[0.6px] text-fg2 uppercase">
              Your position
            </span>
            <b className="text-[30px] leading-none font-extrabold text-accent tabular-nums">
              #{mine.position}
            </b>
            <span className="text-[13px] text-fg2">
              of {playerCount}
              {tiedLabel ? ` · ${tiedLabel}` : ''}
            </span>
          </div>
          {record(mine)}
          <Button
            size="sm"
            className="shrink-0"
            onClick={(event) => {
              event.stopPropagation()
              onShareFinish()
            }}
          >
            <Icon name="share" />
            Share
          </Button>
        </div>
      ) : viewer ? (
        <div className={cardClass}>
          <span className="text-fg2">You didn't play a counted game in this session.</span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] text-fg2">{playerCount} players</span>
        <Button size="sm" onClick={onShareLeaderboard}>
          <Icon name="share" />
          Share leaderboard
        </Button>
      </div>
      {podium}
      <Card padding="none" className="overflow-x-auto px-2 py-1">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-fg2">
              <th className="px-2 py-2 font-semibold">#</th>
              <th className="px-2 py-2 font-semibold">Player</th>
              <th className="px-2 py-2 text-right font-semibold">W</th>
              <th className="px-2 py-2 text-right font-semibold">L</th>
              <th className="px-2 py-2 text-right font-semibold">G</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isViewerRow = row.players.some((player) => player.isViewer)
              const cell = cn(
                'border-t border-border px-2 py-1.5 align-middle',
                isViewerRow && 'bg-accent-subtle font-bold',
              )
              return (
                <tr
                  key={row.id}
                  ref={isViewerRow ? mineRef : undefined}
                  aria-current={isViewerRow ? 'true' : undefined}
                >
                  <td className={cn(cell, 'w-9 text-fg2 tabular-nums')}>{row.position}</td>
                  <td className={cell}>
                    <StandingsPlayerCell
                      size={28}
                      profileLabel={(name) => `${name}. View profile`}
                      faces={row.players.map((player) => ({
                        id: player.id,
                        name: player.name,
                        pictureUrl: player.pictureUrl,
                        onOpen: player.onOpen,
                      }))}
                      names={row.players
                        .map((player) => (player.isViewer ? `${player.name} (you)` : player.name))
                        .join(', ')}
                    />
                  </td>
                  <td className={cn(cell, 'text-right tabular-nums')}>{row.wins}</td>
                  <td className={cn(cell, 'text-right tabular-nums')}>{row.losses}</td>
                  <td className={cn(cell, 'text-right whitespace-nowrap tabular-nums')}>
                    {formatStandingsGames(row.games)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
      <p className="m-0 text-[13px] text-fg2">
        Wins first, then fewer losses. Players with the same wins and losses share a position.
        Counted games only.
      </p>
    </section>
  )
}
