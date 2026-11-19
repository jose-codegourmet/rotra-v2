'use client'

import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { listNames } from '@rotra/ui/forms/match-result-form/default-values'
import { KeyValueList } from '@rotra/ui/key-value-list'
import type { ReactNode } from 'react'

export type FinishMatchSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The match's number in the session */
  matchNumber: number
  /** Team A's short names in lineup order */
  teamANames: string[]
  /** Team B's short names in lineup order */
  teamBNames: string[]
  /** End the match with no result; it still counts toward each player's games */
  onConfirm: () => void
  isPending?: boolean
  /** Why the commit failed; the sheet stays open and nothing is claimed as saved */
  error?: ReactNode
}

/**
 * The Match done sheet of a session with Record games off: "Finish match N?", the two teams and no
 * winner or score. Confirming ends the match with no result; the game still counts toward each
 * player's games.
 */
export function FinishMatchSheet({
  open,
  onOpenChange,
  matchNumber,
  teamANames,
  teamBNames,
  onConfirm,
  isPending = false,
  error,
}: FinishMatchSheetProps) {
  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Finish match ${matchNumber}?`}
      summary={
        <KeyValueList
          items={[
            { label: 'Team A', value: listNames(teamANames) },
            { label: 'Team B', value: listNames(teamBNames) },
          ]}
        />
      }
      consequence="Games aren't recorded in this session, so no result is entered. The game still counts toward each player's games."
      confirmLabel="Match done"
      backLabel="Cancel"
      onConfirm={onConfirm}
      isPending={isPending}
      error={error}
    />
  )
}
