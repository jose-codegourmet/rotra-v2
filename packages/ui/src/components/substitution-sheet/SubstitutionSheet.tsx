'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { ChoiceGroup } from '@rotra/ui/choice-group'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { levelLabel } from '@rotra/ui/level-pill'
import { Notice } from '@rotra/ui/notice'
import { PlayerTile } from '@rotra/ui/player-tile'
import { Sheet } from '@rotra/ui/sheet'
import { type ReactNode, useState } from 'react'

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

/** Who gets this game? Nobody is the default; never both people. */
export type SubstitutionCredit = 'nobody' | 'incoming' | 'outgoing'

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
  /** When Start match was confirmed (ms since epoch); "Started M min ago" */
  startedAt?: number
  /** The clock "Started M min ago" is computed against; defaults to the time of render */
  now?: number
  /** The pick step, or the Confirm substitution step (D-SUBSTITUTE) */
  step: SubstitutionStep
  /** The player coming off; null until chosen */
  outId: string | null
  /** The replacement; null until chosen */
  inId: string | null
  /** Who gets this game?; defaults to Nobody */
  creditTo?: SubstitutionCredit
  onPickOut: (playerId: string) => void
  onPickIn: (playerId: string) => void
  onPickCredit?: (credit: SubstitutionCredit) => void
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

function isCredit(value: string): value is SubstitutionCredit {
  return value === 'nobody' || value === 'incoming' || value === 'outgoing'
}

function creditWarning(creditTo: SubstitutionCredit, outName: string, inName: string): string {
  if (creditTo === 'incoming') {
    return `${inName} gets this game: it counts toward their games, minimum and session wins/losses. ${outName} gets nothing from it. Long-term rank never counts it.`
  }
  if (creditTo === 'outgoing') {
    return `${outName} gets this game: it counts toward their games, minimum and session wins/losses. ${inName} gets nothing from it. Long-term rank never counts it.`
  }
  return "Neither player's partial game will count toward their minimum or long-term performance."
}

/**
 * Q-SUBSTITUTE in two sheet steps. Pick: "Who's coming off?" tiles (noting Team A or B),
 * "Replacement" tiles for present players who are free, or "No present player is free right now.",
 * and "Who gets this game?" (Nobody by default, the incoming player, or the outgoing player) with
 * "Started M min ago". Review substitution needs both players. Confirm (D-SUBSTITUTE): Out, In with
 * level, Team, Gets this game, and the credit warning, with Back and Confirm substitution. The owner
 * holds the step, the two players and the credit choice, and runs the mutation.
 */
export function SubstitutionSheet({
  open,
  onOpenChange,
  matchNo,
  inMatch,
  candidates,
  minimumGames,
  startedAt,
  now,
  step,
  outId,
  inId,
  creditTo: creditToProp,
  onPickOut,
  onPickIn,
  onPickCredit,
  onReview,
  onBack,
  onBackToPick,
  onConfirm,
  isPending = false,
  error,
}: SubstitutionSheetProps) {
  const [localCredit, setLocalCredit] = useState<SubstitutionCredit>('nobody')
  const creditTo = creditToProp ?? localCredit
  const setCredit = (next: SubstitutionCredit) => {
    setLocalCredit(next)
    onPickCredit?.(next)
  }
  const out = inMatch.find((p) => p.id === outId) ?? null
  const incoming = candidates.find((p) => p.id === inId) ?? null
  const minutesAgo = Math.max(
    0,
    Math.round(((now ?? Date.now()) - (startedAt ?? Date.now())) / 60000),
  )

  if (step === 'confirm' && out && incoming) {
    const creditedName =
      creditTo === 'incoming' ? incoming.name : creditTo === 'outgoing' ? out.name : null
    return (
      <ConfirmSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Confirm substitution"
        summary={
          <>
            <KeyValueList
              items={[
                { label: 'Out', value: out.name },
                { label: 'In', value: `${incoming.name} · ${levelLabel(incoming.level)}` },
                { label: 'Team', value: `Team ${out.team}` },
                {
                  label: 'Gets this game',
                  value: creditedName ? `${creditedName} (QM choice)` : 'Nobody',
                },
              ]}
            />
            <Notice tone="warn">{creditWarning(creditTo, out.name, incoming.name)}</Notice>
          </>
        }
        consequence={null}
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
      <fieldset
        aria-label="Who's coming off?"
        className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0"
      >
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
                onClick={() => onPickIn(p.id)}
              />
            ))}
          </div>
        ) : (
          <p className="m-0 text-[13px] text-fg2">No present player is free right now.</p>
        )}
      </fieldset>
      <fieldset
        aria-label="Who gets this game?"
        className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0"
      >
        <span className="text-[13px] font-semibold text-fg2">Who gets this game?</span>
        <ChoiceGroup
          type="single"
          aria-label="Who gets this game?"
          value={creditTo}
          onChange={(value) => {
            if (isCredit(value)) setCredit(value)
          }}
          choices={[
            { value: 'nobody', title: 'Nobody', description: 'Usual' },
            {
              value: 'incoming',
              title: incoming ? `${incoming.name} (coming in)` : 'Player coming in',
              description: 'Counts as a full game for them',
              disabled: !incoming,
            },
            {
              value: 'outgoing',
              title: out ? `${out.name} (going off)` : 'Player going off',
              description: 'Counts as a full game for them',
              disabled: !out,
            },
          ]}
        />
        <p className="m-0 text-[13px] text-fg2">
          Started {minutesAgo} min ago. At most one person gets this game; it never counts toward
          long-term rank.
        </p>
      </fieldset>
    </Sheet>
  )
}
