'use client'

import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { useRef } from 'react'

export type SessionStandingsRow = {
  id: string
  position: number
  /** Per the page's name rule */
  name: string
  pictureUrl?: string | null
  wins: number
  losses: number
  games: number
  /** The viewer's own row: tinted, “(you)” after the name */
  isViewer?: boolean
  /** Opens the profile card; without it the face is plain */
  onOpen?: () => void
}

export type SessionStandingsProps = {
  rows: SessionStandingsRow[]
  /** The signed-in viewer for the Your position card; null (a visitor) shows no card */
  viewer: { name: string; pictureUrl?: string | null } | null
  /** Your position › Share: the system share sheet with “I finished #N of M …” */
  onShareFinish: () => void
  onShareLeaderboard: () => void
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
 * card (picture, “#N of M”, W, L and games; the card scrolls to your row and flashes it; Share), the
 * players count with **Share leaderboard**, the standings table (#, face and name, W, L, G; your row
 * tinted with “(you)”), and the order rule.
 */
export function SessionStandings({
  rows,
  viewer,
  onShareFinish,
  onShareLeaderboard,
}: SessionStandingsProps) {
  const mineRef = useRef<HTMLTableRowElement>(null)
  const mine = rows.find((row) => row.isViewer)
  const record = (row: SessionStandingsRow) => (
    <span className="flex gap-3.5 text-[13px] text-fg2">
      <span>
        <b className="mr-0.5 text-lg text-fg tabular-nums">{row.wins}</b> W
      </span>
      <span>
        <b className="mr-0.5 text-lg text-fg tabular-nums">{row.losses}</b> L
      </span>
      <span>
        <b className="mr-0.5 text-lg text-fg tabular-nums">{row.games}</b> games
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
          aria-label={`Your position, number ${mine.position} of ${rows.length}. Go to your row`}
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
            <span className="text-[13px] text-fg2">of {rows.length}</span>
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
        <span className="text-[13px] text-fg2">{rows.length} players</span>
        <Button size="sm" onClick={onShareLeaderboard}>
          <Icon name="share" />
          Share leaderboard
        </Button>
      </div>
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
              const face = (
                <Avatar
                  name={row.name}
                  src={row.pictureUrl ?? undefined}
                  size={28}
                  className={
                    row.onOpen ? 'group-hover/face:ring-2 group-hover/face:ring-accent' : ''
                  }
                />
              )
              const cell = cn(
                'border-t border-border px-2 py-1.5 align-middle',
                row.isViewer && 'bg-accent-subtle font-bold',
              )
              return (
                <tr
                  key={row.id}
                  ref={row.isViewer ? mineRef : undefined}
                  aria-current={row.isViewer ? 'true' : undefined}
                >
                  <td className={cn(cell, 'w-9 text-fg2 tabular-nums')}>{row.position}</td>
                  <td className={cell}>
                    <span className="inline-flex min-w-0 items-center gap-2.5">
                      {row.onOpen ? (
                        <button
                          type="button"
                          onClick={row.onOpen}
                          aria-label={`${row.name}. View profile`}
                          className="group/face cursor-pointer rounded-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-accent"
                        >
                          {face}
                        </button>
                      ) : (
                        face
                      )}
                      <span className="[overflow-wrap:anywhere]">
                        {row.isViewer ? `${row.name} (you)` : row.name}
                      </span>
                    </span>
                  </td>
                  <td className={cn(cell, 'text-right tabular-nums')}>{row.wins}</td>
                  <td className={cn(cell, 'text-right tabular-nums')}>{row.losses}</td>
                  <td className={cn(cell, 'text-right tabular-nums')}>{row.games}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
      <p className="m-0 text-[13px] text-fg2">
        Wins first, then fewer losses, then head-to-head. Counted games only.
      </p>
    </section>
  )
}
