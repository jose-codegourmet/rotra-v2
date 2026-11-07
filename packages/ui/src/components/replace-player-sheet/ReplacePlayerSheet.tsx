'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { Notice } from '@rotra/ui/notice'
import { PlayerTile } from '@rotra/ui/player-tile'
import { Sheet } from '@rotra/ui/sheet'
import type { ReactNode } from 'react'

/** One player as the Replace player tiles draw them. */
export type ReplacePlayer = {
  /** The SessionPlayer id */
  id: string
  name: string
  photoUrl?: string
  /** The level locked for this session; null when none was set */
  level: PlayingLevel | null
  /** Counted games so far */
  games: number
  /** Minutes since their last game ended (or since arriving); shown on the replacement tiles */
  restMinutes?: number
}

export type ReplacePlayerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  matchNo: number
  /** Everyone in the match, Team A first; the "Who's coming out?" tiles */
  inMatch: (ReplacePlayer & { team: 'A' | 'B'; present: boolean })[]
  /** Present players not in this match and not busy; the "Replacement" tiles */
  candidates: ReplacePlayer[]
  /** The session's minimum games */
  minimumGames: number
  /** The player coming out; null until chosen */
  outId: string | null
  /** The replacement; null until chosen */
  inId: string | null
  onPickOut: (playerId: string) => void
  onPickIn: (playerId: string) => void
  /** Back returns to OnCourtSheet without changing anything */
  onBack: () => void
  /** Replace player: the owner rechecks and runs the lineup change */
  onConfirm: () => void
  /** The change is saving: Replace player cannot fire twice and the sheet cannot be dismissed */
  isPending?: boolean
  /** Shown above the footer, e.g. "Something changed. Review the match again." after a failed recheck */
  message?: ReactNode
  /** Why the change could not be saved ("Changes could not be saved"); nothing changed */
  error?: ReactNode
}

/**
 * "Replace a player in match N" for a match On court: "Who's coming out?" tiles (noting the team
 * and "not present"), "Replacement" tiles for present players who are free, or "No present player
 * is free right now.", and the line that this is a lineup change, not a substitution. Back and
 * Replace player (needs both players). No credit question: the match has not started.
 */
export function ReplacePlayerSheet({
  open,
  onOpenChange,
  matchNo,
  inMatch,
  candidates,
  minimumGames,
  outId,
  inId,
  onPickOut,
  onPickIn,
  onBack,
  onConfirm,
  isPending = false,
  message,
  error,
}: ReplacePlayerSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title={`Replace a player in match ${matchNo}`}
      dismissible={!isPending}
      hideClose={isPending}
      footer={
        <>
          <Button disabled={isPending} onClick={onBack}>
            Back
          </Button>
          <Button
            variant="primary"
            loading={isPending}
            disabled={!outId || !inId}
            onClick={onConfirm}
          >
            Replace player
          </Button>
        </>
      }
    >
      <fieldset
        aria-label="Who's coming out?"
        className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0"
      >
        <span className="text-[13px] font-semibold text-fg2">Who's coming out?</span>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,128px),1fr))] gap-2.5">
          {inMatch.map((p) => (
            <PlayerTile
              key={p.id}
              name={p.name}
              photoUrl={p.photoUrl}
              level={p.level}
              games={p.games}
              minimumGames={minimumGames}
              status={{
                kind: 'note',
                text: `Team ${p.team}${p.present ? '' : ' · not present'}`,
              }}
              pressed={p.id === outId}
              disabled={isPending}
              onClick={() => onPickOut(p.id)}
            />
          ))}
        </div>
      </fieldset>
      <fieldset aria-label="Replacement" className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
        <span className="text-[13px] font-semibold text-fg2">Replacement</span>
        {candidates.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,128px),1fr))] gap-2.5">
            {candidates.map((p) => (
              <PlayerTile
                key={p.id}
                name={p.name}
                photoUrl={p.photoUrl}
                level={p.level}
                games={p.games}
                minimumGames={minimumGames}
                status={{ kind: 'resting', minutes: p.restMinutes ?? 0 }}
                pressed={p.id === inId}
                disabled={isPending}
                onClick={() => onPickIn(p.id)}
              />
            ))}
          </div>
        ) : (
          <p className="m-0 text-[13px] text-fg2">No present player is free right now.</p>
        )}
      </fieldset>
      <p className="m-0 text-[13px] text-fg2">
        The match hasn't started, so this is a lineup change. The replacement plays the whole game;
        it isn't recorded as a substitution.
      </p>
      {message ? <Notice tone="warn">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Sheet>
  )
}
