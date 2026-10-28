'use client'

import type { MatchStatus } from '@rotra/data/match/types'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Sheet } from '@rotra/ui/sheet'

/** One waiting match as the Pick another list shows it. */
export type ChooseMatchRow = {
  matchId: string
  /** Queue position P, shown as "#P" */
  position: number
  /** Team A by short names, e.g. "Mikee, Dexter" */
  teamA: string
  /** Team B by short names, e.g. "Jose, Aaron" */
  teamB: string
  /** "Doubles", "1v2 fun" */
  formatLabel: string
  /** Ready, or why the match cannot start here (matchStatus in match.rules) */
  status: MatchStatus
}

export type ChooseMatchSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The free court's label, e.g. "Court 2" */
  courtLabel: string
  /** Every waiting match in queue order */
  rows: ChooseMatchRow[]
  /** Start here: opens the Start match sheet for this match on this court */
  onStartHere: (matchId: string) => void
}

/**
 * Q-CHOOSE-MATCH: "Start a match on Court X" with one row per waiting match: "#P", the two teams,
 * "FORMAT · Ready to start" or the block reason, and Start here (enabled only when ready). Queue
 * order is a suggestion, not a rule.
 */
export function ChooseMatchSheet({
  open,
  onOpenChange,
  courtLabel,
  rows,
  onStartHere,
}: ChooseMatchSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Start a match on ${courtLabel}`}
      footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}
    >
      <p className="m-0 text-[13px] text-fg2">
        Any ready match can go next. Queue order is a suggestion, not a rule. A match only stays
        locked while one of its players is still on court or isn&apos;t present.
      </p>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {rows.map((row) => {
          const ready = row.status.kind === 'ready'
          const teams = `${row.teamA} vs ${row.teamB}`
          return (
            <li
              key={row.matchId}
              className="flex items-center gap-2.5 rounded-md border border-border-strong bg-bg px-3 py-2.5"
            >
              <span className="font-mono font-bold">#{row.position}</span>
              <div className="min-w-0 flex-1">
                <b className="block font-bold">
                  {row.teamA} <span className="font-normal text-fg2">vs</span> {row.teamB}
                </b>
                <div className={cn('text-[13px]', ready ? 'text-accent' : 'text-fg2')}>
                  {row.formatLabel} · {ready ? 'Ready to start' : row.status.reason}
                </div>
              </div>
              <Button
                size="xs"
                variant={ready ? 'primary' : 'secondary'}
                disabled={!ready}
                aria-label={`Start here: match #${row.position}, ${teams}`}
                onClick={() => onStartHere(row.matchId)}
              >
                Start here
              </Button>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}
