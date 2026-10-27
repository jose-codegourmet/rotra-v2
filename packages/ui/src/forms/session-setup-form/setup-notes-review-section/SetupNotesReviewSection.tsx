'use client'

import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { KeyValueList } from '@rotra/ui/key-value-list'
import type { RepeatOccurrence } from '@rotra/ui/repeat-schedule-panel'
import { Textarea } from '@rotra/ui/textarea'
import type { ReactNode } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import {
  durationMinutes,
  formatMinutes,
  formatsLabel,
  MODE_OPTIONS,
  REPEAT_LABEL,
  slotBudget,
} from '../SessionSetupForm.helpers'
import type { SessionSetupInput } from '../SessionSetupForm.schema'

export type SetupNotesReviewSectionProps = {
  mode: 'create' | 'edit'
  occurrences: RepeatOccurrence[]
  /** The minimum shown when calculated */
  estimatedMinimum: number
  onEditPage: (page: number) => void
  /** Queue › Financials adds the Costs row */
  costsReviewLine?: string
}

/** Page 3 › Notes and review: the optional notes and the review list with Edit links. */
export function SetupNotesReviewSection({
  mode,
  occurrences,
  estimatedMinimum,
  onEditPage,
  costsReviewLine,
}: SetupNotesReviewSectionProps) {
  const form = useFormContext<SessionSetupInput>()
  const values = useWatch({ control: form.control }) as SessionSetupInput
  const edit = (page: number) => (
    <Button size="xs" variant="ghost" onClick={() => onEditPage(page)}>
      Edit
    </Button>
  )
  const row = (text: ReactNode, page?: number) => (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {text}
      {page !== undefined ? edit(page) : null}
    </span>
  )
  const repeating = mode === 'create' && values.repeat !== 'none'
  const created = occurrences.filter((o) => !o.clash).length
  const skipped = occurrences.length - created
  const mode_ = MODE_OPTIONS.find((m) => m.value === values.sessionMode)
  const items = [
    { label: 'Session', value: row(values.title || 'Untitled', 0) },
    {
      label: 'When',
      value: `${values.date} · ${values.startTime}–${values.endTime} (${formatMinutes(durationMinutes(values))})`,
    },
    ...(repeating
      ? [
          {
            label: 'Repeats',
            value: (
              <>
                {REPEAT_LABEL[values.repeat]} · {created} session{created === 1 ? '' : 's'}
                {skipped ? (
                  <span className="text-[13px] text-warn">
                    {' '}
                    ({skipped} clashing date{skipped > 1 ? 's' : ''} skipped)
                  </span>
                ) : null}
              </>
            ),
          },
        ]
      : []),
    {
      label: 'Venue',
      value: (
        <>
          {values.venue.name || '—'}
          {values.venue.address ? (
            <>
              <br />
              <span className="text-[13px] text-fg2">{values.venue.address}</span>
            </>
          ) : null}
        </>
      ),
    },
    {
      label: 'Courts',
      value: row(
        `${values.courtLabels.join(', ')} · ${values.playersPerCourt} per court (${slotBudget(values)} slots)`,
        0,
      ),
    },
    { label: 'Formats', value: row(`${formatsLabel(values)} · ${mode_?.label ?? ''}`, 1) },
    {
      label: 'Minimum',
      value: row(
        `${values.minimumIsCalculated ? estimatedMinimum : values.minimumGames} games per player${values.minimumIsCalculated ? ' (calculated)' : ''}`,
        1,
      ),
    },
    ...(costsReviewLine ? [{ label: 'Costs', value: costsReviewLine }] : []),
  ]
  return (
    <>
      <Field label="Notes" optional hint="Shown on the public session page.">
        <Controller
          control={form.control}
          name="notes"
          render={({ field }) => <Textarea {...field} rows={3} />}
        />
      </Field>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg p-4">
        <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">Review</span>
        <KeyValueList items={items} />
      </div>
    </>
  )
}
