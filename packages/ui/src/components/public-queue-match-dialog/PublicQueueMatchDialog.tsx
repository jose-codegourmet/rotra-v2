'use client'

import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { CourtDrawing, type CourtPlayer } from '@rotra/ui/court-drawing'
import { Sheet } from '@rotra/ui/sheet'

export type PublicQueueMatchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The match's 1-based place in the waiting queue; #1 reads "Next on a court." */
  position: number
  /** The match's name for the title: "Mixed Doubles", "Doubles", "5v5 fun" */
  label: string
  /** Both teams, faces per the public name rule; null when the match has left the queue */
  match: { teamA: CourtPlayer[]; teamB: CourtPlayer[] } | null
}

/** Each team's first half plays on the first court, the rest on the second. */
const halves = (team: CourtPlayer[]) => {
  const cut = Math.ceil(team.length / 2)
  return [team.slice(0, cut), team.slice(cut)] as const
}

/**
 * Q-PUBLIC Queue › View match (2026-11-19-queue-public-queue-compact): one waiting match drawn on a
 * court like Courts now, with level rings and no levels written out. More than six players draw two
 * separate courts with a gap and a "Uses 2 courts" chip. A match that left the queue meanwhile reads
 * "This match has left the queue."
 */
export function PublicQueueMatchDialog({
  open,
  onOpenChange,
  position,
  label,
  match,
}: PublicQueueMatchDialogProps) {
  const players = match ? match.teamA.length + match.teamB.length : 0
  const twoCourts = players > 6
  const [a1, a2] = match ? halves(match.teamA) : [[], []]
  const [b1, b2] = match ? halves(match.teamB) : [[], []]
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={match ? `Queue #${position} · ${label}` : 'Match'}
      footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}
    >
      {match ? (
        <div className="flex flex-col gap-3">
          {twoCourts ? (
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="warn">Uses 2 courts</Chip>
              <span className="text-[13px] text-fg2">
                {players} players over two courts, each team split between them.
              </span>
            </div>
          ) : null}
          <div className="grid gap-3">
            {twoCourts ? (
              <>
                <CourtDrawing teamA={[...a1]} teamB={[...b1]} plainProfileLabel />
                <CourtDrawing teamA={[...a2]} teamB={[...b2]} plainProfileLabel />
              </>
            ) : (
              <CourtDrawing teamA={match.teamA} teamB={match.teamB} plainProfileLabel />
            )}
          </div>
          <p className="m-0 text-[13px] text-fg2">
            {position === 1 ? 'Next on a court.' : 'Waiting in queue.'} The Queue Master can still
            change it.
          </p>
        </div>
      ) : (
        <p className="m-0 text-fg2">This match has left the queue.</p>
      )}
    </Sheet>
  )
}
