'use client'

import { Button } from '@rotra/ui/button'
import { CountStepper } from '@rotra/ui/count-stepper'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import { type ReactNode, useEffect, useRef, useState } from 'react'

export const SET_GAMES_MIN = 0
export const SET_GAMES_MAX = 99

export type SetGamesTarget =
  /** One roster player: the stepper starts at their current shown count */
  | { kind: 'one'; name: string; current: number }
  /** Every roster player: the stepper starts at the roster's median count */
  | { kind: 'all'; count: number; median: number }

export type SetGamesSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: SetGamesTarget
  /** Step 2's primary: the parent saves `games` and closes the sheet on success */
  onConfirm: (games: number) => void
  /** The save is running: the primary shows a spinner, Back and Escape are blocked */
  isPending?: boolean
  /** Why the save failed; shown in the sheet, nothing is claimed as saved */
  error?: ReactNode
}

const clamp = (n: number) => Math.min(SET_GAMES_MAX, Math.max(SET_GAMES_MIN, Math.round(n)))
const COPY = 'Auto Queue, Catch Up and fewest-games sorting use the new count right away.'

/**
 * D-SET-GAMES (#717): **Set games played** for one roster player or everyone. Step 1 shows who, a
 * − N + stepper (0–99) and the line about Auto Queue, Catch Up and sorting; Next leads to the
 * confirmation ("NAME's games played changes from 3 to 5." / "Every player on the roster will show
 * N games played."), with Back and **Set games**. Focus starts on the title; a second tap cannot
 * commit twice; a failure is reported without pretending success.
 */
export function SetGamesSheet({
  open,
  onOpenChange,
  target,
  onConfirm,
  isPending = false,
  error,
}: SetGamesSheetProps) {
  const initial = target.kind === 'one' ? target.current : target.median
  const [games, setGames] = useState(() => clamp(initial))
  const [step, setStep] = useState<1 | 2>(1)
  // Reset to the first step and the prefilled count each time the sheet opens.
  useEffect(() => {
    if (open) {
      setGames(clamp(initial))
      setStep(1)
    }
  }, [open, initial])
  const fired = useRef(false)
  useEffect(() => {
    if (!open || !isPending || error) fired.current = false
  }, [open, isPending, error])
  const confirm = () => {
    if (fired.current || isPending) return
    fired.current = true
    onConfirm(games)
  }

  const who =
    target.kind === 'one'
      ? [
          { label: 'Player', value: target.name },
          {
            label: 'Games played now',
            value: <span className="tabular-nums">{target.current}</span>,
          },
        ]
      : [
          {
            label: 'Players',
            value: `${target.count} on the roster`,
          },
        ]
  const confirmation =
    target.kind === 'one' ? (
      <>
        <b>{target.name}</b>'s games played changes from {target.current} to {games}.
      </>
    ) : (
      <>
        Every player on the roster will show <b>{games}</b> game{games === 1 ? '' : 's'} played.
      </>
    )

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title="Set games played"
      dismissible={!isPending}
      hideClose={isPending}
      footer={
        step === 1 ? (
          <>
            <Button onClick={() => onOpenChange(false)}>Back</Button>
            <Button variant="primary" onClick={() => setStep(2)}>
              Next
            </Button>
          </>
        ) : (
          <>
            <Button disabled={isPending} onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="primary" loading={isPending} onClick={confirm}>
              Set games
            </Button>
          </>
        )
      }
    >
      <KeyValueList items={who} />
      {step === 1 ? (
        <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface p-3">
          <span id="set-games-label" className="text-[13px] font-semibold text-fg2">
            Games played
          </span>
          <CountStepper
            value={games}
            min={SET_GAMES_MIN}
            max={SET_GAMES_MAX}
            onChange={setGames}
            decrementLabel="One game fewer"
            incrementLabel="One game more"
            size="lg"
          />
        </div>
      ) : (
        <p className="m-0">{confirmation}</p>
      )}
      <p className="m-0 text-[13px] text-fg2">{COPY}</p>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Sheet>
  )
}
