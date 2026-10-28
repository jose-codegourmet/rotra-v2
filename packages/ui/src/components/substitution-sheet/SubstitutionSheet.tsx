'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { levelLabel } from '@rotra/ui/level-pill'
import { PlayerTile } from '@rotra/ui/player-tile'
import { Sheet } from '@rotra/ui/sheet'
import type { ReactNode } from 'react'

/** One player as the substitution tiles draw them. */
export type SubstitutionPlayer = {
  /** The SessionPlayer id */
  id: string
  name: string
  photoUrl?: string
  /** The level locked for this session; null when none was set */
  level: PlayingLevel | null
  /** Counted games so far */
  games: number
  /** Minutes since their last game ended (or since arriving); shown on the Replacement tiles */
  restMinutes?: number
}

export type SubstitutionStep = 'pick' | 'confirm'

export type SubstitutionSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  matchNo: number
  /** Everyone in the match, Team A first, each with their team; the "Who's coming off?" tiles */
  inMatch: (SubstitutionPlayer & { team: 'A' | 'B' })[]
  /** Present players not in this match and not playing elsewhere; the "Replacement" tiles */
  candidates: SubstitutionPlayer[]
  /** The session's minimum games */
  minimumGames: number
  /** The pick step, or the Confirm substitution step (D-SUBSTITUTE) */
  step: SubstitutionStep
  /** The player coming off; null until chosen */
  outId: string | null
  /** The replacement; null until chosen */
  inId: string | null
  onPickOut: (playerId: string) => void
  onPickIn: (playerId: string) => void
  /** Review substitution: both chosen, move to the confirm step */
  onReview: () => void
  /** Back on the pick step: returns to the Active match sheet without changing anything */
  onBack: () => void
  /** Back on the confirm step: returns to the pick step with the choice kept */
  onBackToPick: () => void
  /** Confirm substitution: the owner runs the mutation, then returns to Q-ACTIVE-MATCH */
  onConfirm: () => void
  /** The substitution is saving: Confirm substitution cannot fire twice */
  isPending?: boolean
  /** Why the substitution failed, e.g. "Something changed. Review the match again." */
  error?: ReactNode
}

/**
 * Q-SUBSTITUTE in two steps. Pick: "Who's coming off?" tiles for everyone in the match (noting
 * Team A or B) and "Replacement" tiles for present players who are free, or "No present player is
 * free right now."; Review substitution needs both. Confirm (D-SUBSTITUTE): Out, In with level, Team
 * and the partial-game warning, with Back and Confirm substitution. The owner holds the step and the
 * two choices and runs the mutation.
 */
export function SubstitutionSheet({
  open,
  onOpenChange,
  matchNo,
  inMatch,
  candidates,
  minimumGames,
  step,
  outId,
  inId,
  onPickOut,
  onPickIn,
  onReview,
  onBack,
  onBackToPick,
  onConfirm,
  isPending = false,
  error,
}: SubstitutionSheetProps) {
  const out = inMatch.find((p) => p.id === outId) ?? null
  const incoming = candidates.find((p) => p.id === inId) ?? null

  if (step === 'confirm' && out && incoming) {
    return (
      <ConfirmSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Confirm substitution"
        summary={
          <KeyValueList
            items={[
              { label: 'Out', value: out.name },
              { label: 'In', value: `${incoming.name} · ${levelLabel(incoming.level)}` },
              { label: 'Team', value: `Team ${out.team}` },
            ]}
          />
        }
        consequence="Neither player's partial game will count toward their minimum or long-term performance."
        confirmLabel="Confirm substitution"
        onConfirm={onConfirm}
        backLabel="Back"
        onBack={onBackToPick}
        isPending={isPending}
        error={error}
      />
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Substitute in match ${matchNo}`}
      footer={
        <>
          <Button onClick={onBack}>Back</Button>
          <Button variant="primary" disabled={!out || !incoming} onClick={onReview}>
            Review substitution
          </Button>
        </>
      }
    >
      <div role="group" aria-label="Who's coming off?" className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-fg2">Who's coming off?</span>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,128px),1fr))] gap-2.5">
          {inMatch.map((p) => (
            <PlayerTile
              key={p.id}
              name={p.name}
              photoUrl={p.photoUrl}
              level={p.level}
              games={p.games}
              minimumGames={minimumGames}
              status={{ kind: 'note', text: `Team ${p.team}` }}
              pressed={p.id === outId}
              onClick={() => onPickOut(p.id)}
            />
          ))}
        </div>
      </div>
      <div role="group" aria-label="Replacement" className="flex min-w-0 flex-col gap-1.5">
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
                onClick={() => onPickIn(p.id)}
              />
            ))}
          </div>
        ) : (
          <p className="m-0 text-[13px] text-fg2">No present player is free right now.</p>
        )}
      </div>
    </Sheet>
  )
}
