'use client'

import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Notice } from '@rotra/ui/notice'
import { waitClassName } from '@rotra/ui/player-face-button/helpers'
import { Sheet } from '@rotra/ui/sheet'
import type { ReactNode } from 'react'

/** One player picture on a swap card: games this session as a badge, the wait under the name. */
export type SwapMatchPlayer = {
  id: string
  /** Full name, for the picture's description */
  name: string
  /** Nickname or first name, shown under the picture */
  shortName: string
  photoUrl?: string
  /** Counted games so far this session */
  games: number
  /** Minutes since the player's last game, as on the queue cards */
  waitMinutes: number
}

/** A match as a swap card draws it: its number and both teams. */
export type SwapMatchLineup = {
  matchNo: number
  teamA: SwapMatchPlayer[]
  teamB: SwapMatchPlayer[]
}

export type SwapMatchSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "Court 1", or "Court 1 + Court 2" for a merged 5v5 */
  courtLabel: string
  /** The match getting ready on the court now (Match N) */
  current: SwapMatchLineup
  /** The waiting match that goes on the court (Match M) */
  incoming: SwapMatchLineup
  /** The incoming match's place in the queue, which the current match takes: "#P" */
  position: number
  /** The session's minimum games, for each picture's description */
  minimumGames: number
  /** Opened from OnCourtSheet: the back action reads Back to match instead of Cancel */
  fromMatch?: boolean
  /** Cancel closes the sheet; Back to match returns to OnCourtSheet */
  onBack: () => void
  /** Swap matches: the owner rechecks that the same match is still next */
  onConfirm: () => void
  /** The swap is saving: Swap matches cannot fire twice and the sheet cannot be dismissed */
  isPending?: boolean
  /** Shown above the footer, e.g. "Something changed. Review the match again." after a failed recheck */
  message?: ReactNode
  /** Why the swap could not be saved ("Changes could not be saved"); nothing moved */
  error?: ReactNode
}

function Face({ player, minimumGames }: { player: SwapMatchPlayer; minimumGames: number }) {
  return (
    <div
      role="img"
      aria-label={`${player.name}, ${player.games} of ${minimumGames} games, waiting ${player.waitMinutes} min`}
      className="flex min-w-0 flex-col items-center gap-px"
    >
      <span className="relative block leading-none">
        <Avatar
          name={player.name}
          src={player.photoUrl}
          size={28}
          className="size-[30px] text-[11px]"
        />
        <span
          aria-hidden
          className={cn(
            'absolute -top-1 -right-2 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1',
            'bg-on-photo/90 text-[11px] leading-none font-extrabold tabular-nums',
            'text-[color:var(--bg)] [:is(html[data-theme=light])_&]:text-fg',
          )}
        >
          {player.games}
        </span>
      </span>
      <span className="max-w-[60px] truncate text-xs font-semibold">{player.shortName}</span>
      <span
        className={cn(
          'text-[11px] leading-[1.2] font-semibold whitespace-nowrap tabular-nums',
          waitClassName({ kind: 'minutes', minutes: player.waitMinutes }),
        )}
      >
        {player.waitMinutes} min
      </span>
    </div>
  )
}

function Faces({ players, minimumGames }: { players: SwapMatchPlayer[]; minimumGames: number }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-2.5 gap-y-1">
      {players.map((p) => (
        <Face key={p.id} player={p} minimumGames={minimumGames} />
      ))}
    </div>
  )
}

function SwapCard({
  match,
  after,
  minimumGames,
}: {
  match: SwapMatchLineup
  after: boolean
  minimumGames: number
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col items-center gap-1 rounded-md border px-2 py-2.5',
        after ? 'border-accent bg-accent-subtle' : 'border-border-strong bg-bg',
      )}
    >
      <span className={cn('text-[13px]', !after && 'text-fg2')}>
        <b>Match {match.matchNo}</b>
        {after ? ' · after' : ' · now'}
      </span>
      <Faces players={match.teamA} minimumGames={minimumGames} />
      <span className="text-[10px] font-extrabold tracking-[1px] text-fg3">VS</span>
      <Faces players={match.teamB} minimumGames={minimumGames} />
    </div>
  )
}

/**
 * The Swap with the queue confirmation from Q-ON-COURT: "Swap match N with #P?", the sentence that
 * says where each match goes, and one before → after row for the court (the after card has the
 * accent border). Every picture carries the player's games this session as a badge and, under the
 * short name, minutes since their last game in the queue cards' wait colors. The queue slot is
 * described in the sentence only. Footer: Cancel (or Back to match) and Swap matches.
 */
export function SwapMatchSheet({
  open,
  onOpenChange,
  courtLabel,
  current,
  incoming,
  position,
  minimumGames,
  fromMatch = false,
  onBack,
  onConfirm,
  isPending = false,
  message,
  error,
}: SwapMatchSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title={`Swap match ${current.matchNo} with #${position}?`}
      dismissible={!isPending}
      hideClose={isPending}
      footer={
        <>
          <Button disabled={isPending} onClick={onBack}>
            {fromMatch ? 'Back to match' : 'Cancel'}
          </Button>
          <Button variant="primary" loading={isPending} onClick={onConfirm}>
            Swap matches
          </Button>
        </>
      }
    >
      <p className="m-0 text-[13px] text-fg2">
        Match {incoming.matchNo} goes on {courtLabel}, getting ready. Match {current.matchNo} takes
        its place at #{position} in the queue. Nothing starts until you tap Start match.
      </p>
      <section aria-label={courtLabel} className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
          {courtLabel}
        </span>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <SwapCard match={current} after={false} minimumGames={minimumGames} />
          <span aria-hidden className="text-xl font-extrabold text-accent">
            →
          </span>
          <SwapCard match={incoming} after minimumGames={minimumGames} />
        </div>
      </section>
      {message ? <Notice tone="warn">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Sheet>
  )
}
