'use client'

import type { MatchFormat } from '@rotra/data/match/types'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import type { SwapSlot } from '@rotra/ui/swap-sides-area'
import { type MatchLineupTeam, TeamLineup, type TeamLineupPlayer } from '@rotra/ui/team-lineup'
import type { ReactNode } from 'react'

/** The waiting match that Swap with #P would put on this court. */
export type OnCourtSwapTarget = {
  /** The incoming match's number: "Match M" */
  matchNo: number
  /** Its place in the queue, which this match takes: "#P" */
  position: number
  /** Team A's short names, already listed: "Mikee and Dexter" */
  teamANames: string
  /** Team B's short names, already listed: "Jose and Kiko" */
  teamBNames: string
}

/** Which footer action is saving. */
export type OnCourtPendingAction = 'start' | 'send-back'

export type OnCourtSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  matchNo: number
  /** "Court 1", or "Court 1 + Court 2" for a merged 5v5 */
  courtLabel: string
  format: MatchFormat
  /** When the match was put on court, already formatted: "7:42 PM", "yesterday 10:42 PM" */
  placedLabel: string
  teamA: TeamLineupPlayer[]
  teamB: TeamLineupPlayer[]
  /** The session's minimum games */
  minimumGames: number
  /**
   * Why Start match is disabled, from the rules: "Migs is not present". Shown with "Replace the
   * player or send the match back to the queue." Omit when the match can start.
   */
  blockReason?: string
  /**
   * The next waiting match that is ready for this court (same number of courts, counting this
   * match's players as free). Null or omitted: Swap with the queue is disabled.
   */
  swapTarget?: OnCourtSwapTarget | null
  /** False when no free open court is left (two for 5v5): Move to another court is disabled */
  canMoveCourt?: boolean
  /** Opens the player's profile */
  onSelectPlayer: (playerId: string, team: MatchLineupTeam) => void
  /** Switch the players at the two slots (drag or ← / →); teams stay open until Start match */
  onSwap: (from: SwapSlot, to: SwapSlot) => void
  /** Opens Replace a player in match N: a plain lineup change, no substitution, no credit question */
  onReplacePlayer: () => void
  /** Opens Move match N with the free open courts */
  onMoveCourt: () => void
  /** Opens Swap match N with #P? (SwapMatchSheet, with Back to match) */
  onSwapWithQueue: () => void
  /** Send back to queue: the match goes to the top of the queue and the court frees */
  onSendBack: () => void
  /** Start match: one tap, the owner rechecks presence and busy players; the timer starts now */
  onStart: () => void
  /** Start match or Send back is saving: it cannot fire twice and the sheet cannot be dismissed */
  pendingAction?: OnCourtPendingAction
  /** Shown above the footer, e.g. "Something changed. Review the match again." after a failed recheck */
  message?: ReactNode
  /** Why the change could not be saved ("Changes could not be saved"); nothing is claimed as started */
  error?: ReactNode
}

const FORMAT_LABEL: Record<MatchFormat, string> = {
  singles: 'Singles',
  doubles: 'Doubles',
  fun_1v2: '1v2 fun',
  fun_3v3: '3v3 fun',
  fun_4v4: '4v4 fun',
  fun_5v5: '5v5 fun',
}

const isFun = (format: MatchFormat) => format.startsWith('fun_')

/**
 * Q-ON-COURT: a match placed on its court but not started. "Match N · Court X · Getting ready" with
 * the format chip (plus Fun game) and the Getting ready chip, Team A VS Team B with switch sides,
 * Replace player, Move to another court and Swap with #P (with the line naming the incoming match),
 * then Send back to queue and the primary Start match. A block reason (a player not present) shows
 * as an error notice and disables Start match. Changes here are lineup edits, never substitutions.
 */
export function OnCourtSheet({
  open,
  onOpenChange,
  matchNo,
  courtLabel,
  format,
  placedLabel,
  teamA,
  teamB,
  minimumGames,
  blockReason,
  swapTarget,
  canMoveCourt = true,
  onSelectPlayer,
  onSwap,
  onReplacePlayer,
  onMoveCourt,
  onSwapWithQueue,
  onSendBack,
  onStart,
  pendingAction,
  message,
  error,
}: OnCourtSheetProps) {
  const pending = !!pendingAction
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next)
      }}
      title={`Match ${matchNo} · ${courtLabel} · Getting ready`}
      dismissible={!pending}
      hideClose={pending}
      footer={
        <>
          <Button disabled={pending} loading={pendingAction === 'send-back'} onClick={onSendBack}>
            Send back to queue
          </Button>
          <Button
            variant="primary"
            disabled={pending || !!blockReason}
            loading={pendingAction === 'start'}
            onClick={onStart}
          >
            Start match
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="solid">{FORMAT_LABEL[format]}</Chip>
        {isFun(format) ? <Chip>Fun game</Chip> : null}
        <Chip>Getting ready</Chip>
      </div>
      <TeamLineup
        teamA={teamA}
        teamB={teamB}
        minimumGames={minimumGames}
        onSelectPlayer={onSelectPlayer}
        onSwap={onSwap}
      />
      <p className="m-0 text-[13px] text-fg2">
        Drag a player onto someone on the other team to switch sides. Placed {placedLabel}; the time
        starts when you tap Start match.
      </p>
      {blockReason ? (
        <Notice tone="error">
          {blockReason}. Replace the player or send the match back to the queue.
        </Notice>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={pending} onClick={onReplacePlayer}>
          Replace player
        </Button>
        <Button size="sm" disabled={pending || !canMoveCourt} onClick={onMoveCourt}>
          Move to another court
        </Button>
        <Button size="sm" disabled={pending || !swapTarget} onClick={onSwapWithQueue}>
          {swapTarget ? `Swap with #${swapTarget.position}` : 'Swap with the queue'}
        </Button>
      </div>
      <p className="m-0 text-[13px] text-fg2">
        {swapTarget
          ? `Swap: Match ${swapTarget.matchNo} (${swapTarget.teamANames} vs ${swapTarget.teamBNames}) goes on ${courtLabel}, and this match takes its place at #${swapTarget.position} in the queue.`
          : 'Swap: no other waiting match is ready for this court.'}
      </p>
      {message ? <Notice tone="warn">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Sheet>
  )
}
