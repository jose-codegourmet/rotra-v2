'use client'

import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { Notice } from '@rotra/ui/notice'
import { type MatchLineupTeam, TeamLineup, type TeamLineupPlayer } from '@rotra/ui/team-lineup'
import type { ReactNode } from 'react'

export type InvalidMatchSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The match's number: "Match N on Court X" */
  matchNo: number
  /** The occupied court labels: one, or two for 5v5 */
  courtLabels: string[]
  teamA: TeamLineupPlayer[]
  teamB: TeamLineupPlayer[]
  /** The session's minimum games, for each card's games count */
  minimumGames: number
  /** Opens the player's profile; its footer is Back to match */
  onSelectPlayer: (playerId: string, team: MatchLineupTeam) => void
  /** Commit the permanent invalid decision (useInvalidateMatch) */
  onConfirm: () => void
  /** Keep playing: back to the active match */
  onKeepPlaying: () => void
  /** The commit is running: Confirm cannot fire twice, Keep playing and Escape are blocked */
  isPending?: boolean
  /** Why the commit failed; the sheet stays open and the match stays active */
  error?: ReactNode
}

/**
 * D-INVALID-MATCH: "Mark match invalid?". Match N on Court X, both teams, the error notice that no
 * game, win, loss or minimum-game credit will be recorded, Keep playing and the destructive
 * "Confirm invalid match". No reason field. Focus starts on the title, never on the primary.
 */
export function InvalidMatchSheet({
  open,
  onOpenChange,
  matchNo,
  courtLabels,
  teamA,
  teamB,
  minimumGames,
  onSelectPlayer,
  onConfirm,
  onKeepPlaying,
  isPending = false,
  error,
}: InvalidMatchSheetProps) {
  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Mark match invalid?"
      summary={
        <>
          <p className="m-0">
            Match {matchNo} on {courtLabels.join(' + ')}
          </p>
          <TeamLineup
            teamA={teamA}
            teamB={teamB}
            minimumGames={minimumGames}
            onSelectPlayer={onSelectPlayer}
          />
          <Notice tone="error">
            No game, win, loss, or minimum-game credit will be recorded. This decision cannot be
            changed.
          </Notice>
        </>
      }
      consequence={null}
      confirmLabel="Confirm invalid match"
      onConfirm={onConfirm}
      backLabel="Keep playing"
      onBack={onKeepPlaying}
      isPending={isPending}
      error={error}
      destructive
    />
  )
}
