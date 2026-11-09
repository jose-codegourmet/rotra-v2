'use client'

import { Button } from '@rotra/ui/button'
import { CourtDrawing, type CourtPlayer } from '@rotra/ui/court-drawing'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import type { ReactNode } from 'react'

export type ConfirmMakeMatchSheetProps = {
  open: boolean
  teamA: CourtPlayer[]
  teamB: CourtPlayer[]
  formatLabel: string
  levelA: number
  levelB: number
  arranged: boolean
  onArrange: () => void
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
  error?: ReactNode
}

/** Confirmation for the selected players; the caller owns team arrangement and placement. */
export function ConfirmMakeMatchSheet({
  open,
  teamA,
  teamB,
  formatLabel,
  levelA,
  levelB,
  arranged,
  onArrange,
  onConfirm,
  onCancel,
  isPending = false,
  error,
}: ConfirmMakeMatchSheetProps) {
  const difference = Math.abs(levelA - levelB)
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && !isPending) onCancel()
      }}
      title="Make this match?"
      dismissible={!isPending}
      hideClose={isPending}
      footer={
        <>
          <Button disabled={isPending} onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={isPending} onClick={onArrange}>
            Arrange to balance
          </Button>
          <Button variant="primary" loading={isPending} onClick={onConfirm}>
            Make match
          </Button>
        </>
      }
    >
      <p className="m-0 text-[13px] text-fg2">
        {formatLabel} · added to the end of the Main Queue. The number on each face is that player's
        games so far.
      </p>
      <CourtDrawing
        courts={Math.max(teamA.length, teamB.length) > 3 ? 2 : 1}
        teamA={teamA}
        teamB={teamB}
        showLevels
      />
      <div className="flex items-center justify-between gap-2 text-[13px]">
        <span>
          Team A level <b className="tabular-nums">{levelA}</b>
        </span>
        <span className={difference > 1 ? 'text-fg2' : undefined}>
          {difference === 0 ? 'Even' : `${difference} apart`}
        </span>
        <span>
          Team B level <b className="tabular-nums">{levelB}</b>
        </span>
      </div>
      {arranged ? <Notice tone="success">Arranged to balance the teams by level.</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Sheet>
  )
}
