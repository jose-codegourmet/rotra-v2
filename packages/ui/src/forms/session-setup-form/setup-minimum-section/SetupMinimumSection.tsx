'use client'

import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { Field } from '@rotra/ui/field'
import { TextInput } from '@rotra/ui/text-input'
import { useRef } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import {
  durationMinutes,
  formatMinutes,
  formatMixLabel,
  playersPerGame,
  slotBudget,
} from '../SessionSetupForm.helpers'
import type { SessionSetupInput } from '../SessionSetupForm.schema'

export type SetupMinimumSectionProps = {
  /** The rule from @rotra/data, given the values and the player count */
  computeEstimate: (
    values: SessionSetupInput,
    players: number,
  ) => { low: number; high: number; usable: number }
  /** Players already on the roster (editing); replaces expected players */
  rosterCount?: number
}

/** Page 2 › Minimum games: expected players, the estimate, and the calculated or own minimum. */
export function SetupMinimumSection({
  computeEstimate,
  rosterCount = 0,
}: SetupMinimumSectionProps) {
  const form = useFormContext<SessionSetupInput>()
  const { errors } = form.formState
  const values = useWatch({ control: form.control }) as SessionSetupInput
  const minimumRef = useRef<HTMLInputElement>(null)
  const slots = slotBudget(values)
  const expected = Number(values.expectedPlayers)
  const players = rosterCount || (Number.isInteger(expected) && expected > 0 ? expected : slots)
  const est = computeEstimate(values, players)
  const per = playersPerGame(values)
  const courts = values.courtLabels.length
  const auto = values.minimumIsCalculated

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>Minimum completed games per player</span>
        {auto ? <Chip tone="accent">Calculated</Chip> : <Chip>Set by you</Chip>}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5">
        {rosterCount ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-fg2">Players</span>
            <span>{rosterCount} on the roster</span>
            <span className="text-xs text-fg2">Updates as you add or remove players.</span>
          </div>
        ) : (
          <Field
            label="Expected players"
            error={errors.expectedPlayers?.message}
            hint={
              errors.expectedPlayers
                ? undefined
                : `Your best guess. Leave empty to use your ${slots} slots. The roster replaces it once you add players.`
            }
          >
            <Controller
              control={form.control}
              name="expectedPlayers"
              render={({ field }) => (
                <TextInput
                  {...field}
                  inputMode="numeric"
                  placeholder={String(slots)}
                  invalid={Boolean(errors.expectedPlayers)}
                />
              )}
            />
          </Field>
        )}
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-fg2">Estimate</span>
          <span>
            <b className="text-xl tabular-nums">{players ? `${est.low}–${est.high}` : '—'}</b> games
            each
          </span>
          <span className="text-xs text-fg2">
            {est.usable} of {courts} court{courts > 1 ? 's' : ''} ×{' '}
            {formatMinutes(durationMinutes(values))} of {formatMixLabel(values)} at 15–20 min a
            game. About {Math.min(players, Math.round(est.usable * per))} of {players || '?'}{' '}
            players are on court at once
            {per < 4 ? ', so each player gets fewer turns than in doubles' : ''}.
          </span>
        </div>
        <Field
          label="Minimum"
          error={auto ? undefined : errors.minimumGames?.message}
          hint={
            !auto && errors.minimumGames
              ? undefined
              : auto
                ? 'Uses the 20-minute end so everyone can reach it.'
                : `Estimate suggests ${est.low}.`
          }
        >
          <Controller
            control={form.control}
            name="minimumGames"
            render={({ field }) => (
              <TextInput
                {...field}
                ref={(el) => {
                  field.ref(el)
                  minimumRef.current = el
                }}
                value={auto ? String(est.low) : field.value}
                disabled={auto}
                inputMode="numeric"
                invalid={!auto && Boolean(errors.minimumGames)}
              />
            )}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        {auto ? (
          <Button
            size="xs"
            onClick={() => {
              form.setValue('minimumGames', String(est.low), { shouldDirty: true })
              form.setValue('minimumIsCalculated', false, { shouldDirty: true })
              setTimeout(() => minimumRef.current?.focus(), 0)
            }}
          >
            Set it yourself
          </Button>
        ) : (
          <Button
            size="xs"
            onClick={() => {
              form.setValue('minimumIsCalculated', true, { shouldDirty: true })
              form.setValue('minimumGames', String(est.low), {
                shouldDirty: true,
                shouldValidate: true,
              })
            }}
          >
            Use the estimate
          </Button>
        )}
      </div>
      <p className="m-0 text-xs text-fg2">
        Full fun games count toward it. Partial and invalid games don’t. It’s a target, not a
        guarantee.
      </p>
    </>
  )
}
