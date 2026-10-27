'use client'

import { Card } from '@rotra/ui/card'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { listNames } from '@rotra/ui/forms/match-result-form/default-values'
import { Notice } from '@rotra/ui/notice'
import type { ReactNode } from 'react'

export type ConfirmResultSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The winner Review result settled on */
  winningTeam: 'A' | 'B'
  /** Team A's short names in lineup order */
  teamANames: string[]
  /** Team B's short names in lineup order */
  teamBNames: string[]
  /** The final score; both null when no score was entered (never 0–0) */
  teamAScore: number | null
  teamBScore: number | null
  /** The occupied court labels: one, or two for 5v5 */
  courtLabels: string[]
  /** Commit the permanent result (useCompleteMatch) */
  onConfirm: () => void
  /** Back to result: reopen the Match N result sheet with what was entered */
  onBack: () => void
  /** The commit is running: Confirm cannot fire twice, Back and Escape are blocked */
  isPending?: boolean
  /** Why the commit failed; the sheet stays open and nothing is claimed as saved */
  error?: ReactNode
}

/**
 * D-WINNER: the review step "Confirm match result". Winner card (Team A: names, Against Team B:
 * names, the score as "21–17 (Team A–Team B)" or "No score entered", the court(s)), the permanent
 * warning, Back to result and the primary "Confirm Team A wins" (never a neutral Save).
 */
export function ConfirmResultSheet({
  open,
  onOpenChange,
  winningTeam,
  teamANames,
  teamBNames,
  teamAScore,
  teamBScore,
  courtLabels,
  onConfirm,
  onBack,
  isPending = false,
  error,
}: ConfirmResultSheetProps) {
  const losingTeam = winningTeam === 'A' ? 'B' : 'A'
  const winners = winningTeam === 'A' ? teamANames : teamBNames
  const losers = winningTeam === 'A' ? teamBNames : teamANames
  const hasScore = teamAScore !== null && teamBScore !== null
  const twoCourts = courtLabels.length > 1

  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm match result"
      summary={
        <>
          <Card className="flex flex-col gap-3">
            <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
              Winner
            </span>
            <h2 className="m-0 text-lg font-bold">
              Team {winningTeam}: {listNames(winners)}
            </h2>
            <p className="m-0 text-[13px] text-fg2">
              Against Team {losingTeam}: {listNames(losers)}
            </p>
            {hasScore ? (
              <p className="m-0 tabular-nums">
                <b>
                  {teamAScore}–{teamBScore}
                </b>{' '}
                <span className="text-[13px] text-fg2">(Team A–Team B)</span>
              </p>
            ) : (
              <p className="m-0 text-[13px] text-fg2">No score entered</p>
            )}
            <p className="m-0 text-[13px] text-fg2">{courtLabels.join(' + ')}</p>
          </Card>
          <Notice tone="warn" title="This result cannot be changed after confirmation.">
            {twoCourts ? 'Both courts will become available.' : 'The court will become available.'}
          </Notice>
        </>
      }
      consequence={null}
      confirmLabel={`Confirm Team ${winningTeam} wins`}
      onConfirm={onConfirm}
      backLabel="Back to result"
      onBack={onBack}
      isPending={isPending}
      error={error}
    />
  )
}
