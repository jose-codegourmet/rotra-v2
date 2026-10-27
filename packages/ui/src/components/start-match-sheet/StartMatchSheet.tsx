'use client'

import type { MatchFormat, MatchStatus } from '@rotra/data/match/types'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { CourtPicker, type CourtPickerCourt } from '@rotra/ui/court-picker'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import type { SwapSlot } from '@rotra/ui/swap-sides-area'
import { type MatchLineupTeam, TeamLineup, type TeamLineupPlayer } from '@rotra/ui/team-lineup'
import type { ReactNode } from 'react'

/** The waiting match the sheet starts: its number, format and the two teams. */
export type StartMatchLineup = {
  matchNo: number
  format: MatchFormat
  teamA: TeamLineupPlayer[]
  teamB: TeamLineupPlayer[]
}

export type StartMatchSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  match: StartMatchLineup
  /** The session's minimum games */
  minimumGames: number
  /** Ready, or why the match cannot start yet (matchStatus in match.rules) */
  status: MatchStatus
  /** Every free court; the owner preselects the one that opened the sheet (plus a second for 5v5) */
  freeCourts: CourtPickerCourt[]
  /** The chosen court ids, oldest first */
  courtIds: string[]
  onCourtIdsChange: (courtIds: string[]) => void
  /** Opens the player's profile; its footer is Back to match */
  onSelectPlayer: (playerId: string, team: MatchLineupTeam) => void
  /** Switch the players at the two slots (drag or ← / →) before starting */
  onSwap: (from: SwapSlot, to: SwapSlot) => void
  /** Back: closes the sheet without starting */
  onBack: () => void
  /** Start match with the chosen courts; the owner rechecks players and courts */
  onStart: () => void
  /** The start is running: Start match cannot fire twice and the sheet cannot be dismissed */
  isPending?: boolean
  /** Shown above the footer, e.g. "Something changed. Review the match again." after a failed recheck */
  message?: ReactNode
  /** Why the start could not be saved ("Changes could not be saved"); the sheet stays open with its courts and nothing is claimed as started */
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
 * D-START-MATCH (Q-DISPATCH): "Start match N" with the format chip (plus Fun game), Team A VS Team B
 * with switch sides, the free-court buttons (two for 5v5), and the block reason when the match is
 * not ready. Start match stays disabled until the required courts are chosen and the match is ready.
 * Starting is an explicit Queue Master action, never automatic dispatch.
 */
export function StartMatchSheet({
  open,
  onOpenChange,
  match,
  minimumGames,
  status,
  freeCourts,
  courtIds,
  onCourtIdsChange,
  onSelectPlayer,
  onSwap,
  onBack,
  onStart,
  isPending = false,
  message,
  error,
}: StartMatchSheetProps) {
  const required = match.format === 'fun_5v5' ? 2 : 1
  const ready = status.kind === 'ready'
  const canStart =
    ready && courtIds.length === required && courtIds.every((id) => freeCourts.some((c) => c.id === id))
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title={`Start match ${match.matchNo}`}
      dismissible={!isPending}
      hideClose={isPending}
      footer={
        <>
          <Button disabled={isPending} onClick={onBack}>
            Back
          </Button>
          <Button variant="primary" disabled={!canStart} loading={isPending} onClick={onStart}>
            Start match
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="solid">{FORMAT_LABEL[match.format]}</Chip>
        {isFun(match.format) ? <Chip>Fun game</Chip> : null}
      </div>
      <TeamLineup
        teamA={match.teamA}
        teamB={match.teamB}
        minimumGames={minimumGames}
        onSelectPlayer={onSelectPlayer}
        onSwap={onSwap}
      />
      <p className="m-0 text-[13px] text-fg2">
        Drag a player onto someone on the other team to switch sides.
      </p>
      <CourtPicker
        courts={freeCourts}
        value={courtIds}
        required={required}
        onChange={onCourtIdsChange}
        disabled={isPending}
      />
      {ready ? null : <Notice tone="error">{status.reason}</Notice>}
      {message ? <Notice tone="warn">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Sheet>
  )
}
