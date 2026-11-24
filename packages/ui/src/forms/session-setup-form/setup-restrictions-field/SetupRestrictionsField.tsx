'use client'

import {
  LEVEL_BANDS,
  LEVEL_RESTRICTION_OPTIONS,
  type LevelBand,
  type LevelRestrictionKind,
  type LevelSlots,
  levelRestrictionOf,
  levelSlotsError,
} from '@rotra/schema/level-restriction'
import { ChoiceGroup } from '@rotra/ui/choice-group'
import { Field } from '@rotra/ui/field'
import { TextInput } from '@rotra/ui/text-input'
import { useFormContext, useWatch } from 'react-hook-form'
import type { SessionSetupInput } from '../SessionSetupForm.schema'

export const RESTRICTIONS_HINT =
  "Which levels can take a slot. Players outside it can't request to join from the session page; you can still add them yourself after a warning. Players with no level yet can request, and the level you pick when confirming counts."

const BAND_LABEL: Record<LevelBand, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

/** Slots per level, first split from the session's slots: the rest to Beginner, a third each otherwise. */
export function splitSlots(capacity: number): LevelSlots {
  const third = Math.floor(capacity / 3)
  return { beginner: capacity - third * 2, intermediate: third, advanced: third }
}

/** The running line under the number fields: "N of CAP slots · matches the session / X left to place / X too many". */
export function slotsRunningLine(sum: number, capacity: number): string {
  const tail =
    sum === capacity
      ? ' · matches the session'
      : sum < capacity
        ? ` · ${capacity - sum} left to place`
        : ` · ${sum - capacity} too many`
  return `${sum} of ${capacity} slots${tail}`
}

/** The text a refused save shows under the field, whatever path the schema reported it on. */
function restrictionError(errors: unknown): string | undefined {
  const found = (errors as { levelRestriction?: unknown } | undefined)?.levelRestriction
  const first = (node: unknown): string | undefined => {
    if (!node || typeof node !== 'object') return undefined
    const { message, ...rest } = node as { message?: unknown }
    if (typeof message === 'string' && message) return message
    for (const child of Object.values(rest)) {
      const text = first(child)
      if (text) return text
    }
    return undefined
  }
  return first(found)
}

/**
 * Q-SETUP › Formats and mode › Restrictions (D-2026-11-19-12): which levels can take a slot, one pick
 * as choice cards (All levels, Beginners only, Beginners to intermediate, Slots per level). Slots per
 * level adds Beginner, Intermediate and Advanced number fields and a running line that must reach the
 * session's slots (courts × players per court) before saving. Reads and writes `levelRestriction`.
 */
export function SetupRestrictionsField() {
  const form = useFormContext<SessionSetupInput>()
  const raw = useWatch({ control: form.control, name: 'levelRestriction' })
  const restriction = levelRestrictionOf(raw)
  const courts = useWatch({ control: form.control, name: 'courtLabels' }).length
  const perCourt = useWatch({ control: form.control, name: 'playersPerCourt' })
  const capacity = courts * (Number(perCourt) || 0)
  const error = restrictionError(form.formState.errors)
  // The typed numbers as they are, so a cleared field stays empty instead of reading 0.
  const slots = restriction.kind === 'per-level' ? raw?.slots : undefined
  const sum = LEVEL_BANDS.reduce((total, band) => total + (Number(slots?.[band]) || 0), 0)
  const slotsValid = levelSlotsError(restriction, courts, Number(perCourt) || 0) === null

  const setKind = (kind: LevelRestrictionKind) => {
    if (kind === restriction.kind) return
    const keep = LEVEL_BANDS.some((band) => Number(slots?.[band]))
    form.setValue(
      'levelRestriction',
      kind === 'per-level'
        ? {
            kind,
            slots: keep
              ? { beginner: 0, intermediate: 0, advanced: 0, ...slots }
              : splitSlots(capacity),
          }
        : { kind },
      { shouldDirty: true },
    )
    form.clearErrors('levelRestriction')
  }
  const setSlot = (band: LevelBand, text: string) => {
    form.setValue(
      'levelRestriction',
      {
        kind: 'per-level',
        slots: {
          beginner: slots?.beginner ?? 0,
          intermediate: slots?.intermediate ?? 0,
          advanced: slots?.advanced ?? 0,
          [band]: text.trim() === '' ? Number.NaN : Number(text),
        },
      },
      { shouldDirty: true },
    )
    form.clearErrors('levelRestriction')
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-fg2">Restrictions</span>
      <ChoiceGroup
        type="single"
        aria-label="Which levels can take a slot"
        value={restriction.kind}
        onChange={(value) => setKind(value as LevelRestrictionKind)}
        choices={LEVEL_RESTRICTION_OPTIONS.map((o) => ({
          value: o.kind,
          title: o.label,
          description: o.text,
        }))}
      />
      {restriction.kind === 'per-level' ? (
        <>
          <div className="grid grid-cols-3 gap-2.5 max-[420px]:grid-cols-1">
            {LEVEL_BANDS.map((band) => {
              const value = Number(slots?.[band])
              return (
                <Field key={band} label={BAND_LABEL[band]}>
                  <TextInput
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    invalid={Boolean(error)}
                    value={
                      Number.isFinite(value) && slots?.[band] !== undefined ? String(value) : ''
                    }
                    onChange={(event) => setSlot(band, event.target.value)}
                  />
                </Field>
              )
            })}
          </div>
          <span
            aria-live="polite"
            className={slotsValid ? 'text-xs text-fg2' : 'text-[13px] font-semibold text-error'}
          >
            {slotsRunningLine(sum, capacity)}
          </span>
        </>
      ) : null}
      {error ? (
        <span aria-live="polite" className="text-[13px] font-semibold text-error">
          {error}
        </span>
      ) : null}
      <span className="text-xs text-fg2">{RESTRICTIONS_HINT}</span>
    </div>
  )
}
