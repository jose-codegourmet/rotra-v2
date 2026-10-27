'use client'

import { formatPeso, moneyField } from '@rotra/schema/money'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { CountStepper } from '@rotra/ui/count-stepper'
import { Field } from '@rotra/ui/field'
import { Switch } from '@rotra/ui/switch'
import { TextInput } from '@rotra/ui/text-input'
import { useId, useState } from 'react'

export type SessionDefaultsPanelProps = {
  /** 2–20 */
  playersPerCourt: number
  onPlayersPerCourtChange: (value: number) => void
  /** Default entrance fee per head in centavos, or null for none */
  entranceFeeMinor: number | null
  onSaveEntranceFee: (minor: number) => void
  /** Turning the switch off removes the default fee */
  onClearEntranceFee: () => void
  isPending?: boolean
}

const minorToInput = (minor: number | null) => (minor == null ? '' : String(minor / 100))

/** Club settings › Session defaults: players per court (the slot budget) and a default entrance fee. */
export function SessionDefaultsPanel({
  playersPerCourt,
  onPlayersPerCourtChange,
  entranceFeeMinor,
  onSaveEntranceFee,
  onClearEntranceFee,
  isPending,
}: SessionDefaultsPanelProps) {
  const id = useId()
  const [feeOn, setFeeOn] = useState(entranceFeeMinor != null)
  const [amount, setAmount] = useState(minorToInput(entranceFeeMinor))
  const [error, setError] = useState<string>()

  const save = () => {
    const parsed = amount.trim() === '' ? null : moneyField.safeParse(amount)
    if (!parsed?.success) return setError('Enter an amount, 0 or more.')
    setError(undefined)
    onSaveEntranceFee(parsed.data)
  }

  return (
    <Card asChild>
      <section aria-labelledby={`${id}-h`} className="flex flex-col gap-3">
        <div>
          <h2 id={`${id}-h`}>Session defaults</h2>
          <p className="m-0 text-[13px] text-fg2">
            Used to fill in new sessions. You can still change them in each session.
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 flex-1">
            <b>Players per court</b>
            <p className="m-0 text-[13px] text-fg2">
              Your slot budget: {playersPerCourt} players for each court you reserve, so 3 courts
              give {3 * playersPerCourt} slots. The rest go on the waitlist.
            </p>
          </div>
          <CountStepper
            value={playersPerCourt}
            min={2}
            max={20}
            onChange={onPlayersPerCourtChange}
            decrementLabel="Fewer players per court"
            incrementLabel="More players per court"
          />
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 flex-1">
            <b>Entrance fee per head</b>
            <p className="m-0 text-[13px] text-fg2">
              {entranceFeeMinor != null
                ? `New sessions list a ${formatPeso(entranceFeeMinor)} entrance fee per head, unless the venue has its own.`
                : 'New sessions start with no entrance fee, unless the venue has one.'}{' '}
              A misc cost, shown for transparency.
            </p>
          </div>
          <Switch
            aria-label="Add an entrance fee per head by default"
            checked={feeOn}
            onChange={(on) => {
              setFeeOn(on)
              setError(undefined)
              if (!on) {
                setAmount('')
                onClearEntranceFee()
              }
            }}
          />
        </div>
        {feeOn ? (
          <Field
            label="Amount per person"
            error={error}
            hint={
              error
                ? undefined
                : "It's added to each session's costs, so the payment per player covers it."
            }
          >
            <div className="flex flex-nowrap items-center gap-2">
              <div className="flex flex-1 items-center gap-1.5">
                <span aria-hidden className="font-bold text-fg2">
                  ₱
                </span>
                <TextInput
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <Button onClick={save} loading={isPending}>
                Save
              </Button>
            </div>
          </Field>
        ) : null}
      </section>
    </Card>
  )
}
