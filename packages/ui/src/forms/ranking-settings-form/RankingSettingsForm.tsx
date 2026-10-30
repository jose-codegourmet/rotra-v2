'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { parseWholeNumber, rankingSettingsErrors } from '@rotra/schema/ranking-settings'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { TextInput, type TextInputProps } from '@rotra/ui/text-input'
import { WeightSplitBar } from '@rotra/ui/weight-split-bar'
import { useId } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { isRankingDraftDirty } from './RankingSettingsForm.defaultValues'
import {
  type RankingSettingsFormInput,
  type RankingSettingsFormValues,
  rankingSettingsFormSchema,
} from './RankingSettingsForm.schema'

export type RankingSettingsFormProps = {
  /** The draft. The container keeps it, so it survives a failed save or a conflict */
  values: RankingSettingsFormInput
  /** The effective values the draft is compared with for "Unsaved draft" */
  baseline: RankingSettingsFormValues
  onChange: (values: RankingSettingsFormInput) => void
  /** Review changes: the container opens the Save configuration? sheet (D-CONFIG) */
  onSubmit: (values: RankingSettingsFormValues) => void
  onDiscard: () => void
  /** Someone else saved a version while editing: Review changes stays off until it's resolved */
  locked?: boolean
  /** Why saving failed; the draft and the effective values are both kept */
  serverError?: string
}

/** The prototypes' .affix with a % block joined to the right of the input. */
function PercentInput(props: TextInputProps) {
  return (
    <div className="flex items-stretch">
      <TextInput {...props} inputMode="numeric" className="rounded-r-none" />
      <b
        aria-hidden="true"
        className="grid place-items-center rounded-r-md border border-l-0 border-border-strong bg-elev px-3 font-semibold text-fg2"
      >
        %
      </b>
    </div>
  )
}

/**
 * A-RANK-CONFIG › Edit: the club assessment and match performance weights with their split and total,
 * and the overall leaderboard requirement. Errors show as the values are typed, as in the prototype.
 * Review changes submits to the container; the form never saves.
 */
export function RankingSettingsForm({
  values,
  baseline,
  onChange,
  onSubmit,
  onDiscard,
  locked = false,
  serverError,
}: RankingSettingsFormProps) {
  const headingId = useId()
  const form = useForm<RankingSettingsFormInput, unknown, RankingSettingsFormValues>({
    resolver: zodResolver(rankingSettingsFormSchema),
    values,
  })
  const errors = rankingSettingsErrors(values)
  const valid = Object.keys(errors).length === 0
  const dirty = isRankingDraftDirty(values, baseline)
  const assessment = parseWholeNumber(values.assessment) ?? 0
  const performance = parseWholeNumber(values.performance) ?? 0
  const total = assessment + performance

  const change = (name: keyof RankingSettingsFormInput, value: string) => {
    form.setValue(name, value)
    onChange({ ...values, [name]: value })
  }

  return (
    <Card asChild>
      <section aria-labelledby={headingId}>
        <FormProvider {...form}>
          <form
            noValidate
            className="flex flex-col gap-3"
            onSubmit={form.handleSubmit((parsed) => {
              if (dirty && !locked) onSubmit(parsed)
            })}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h2 id={headingId}>Edit</h2>
                <p className="m-0 text-[13px] text-fg2">
                  Whole percentages only, so the saved total is exactly 100%.
                </p>
              </div>
              {dirty ? <Chip tone="warn">Unsaved draft</Chip> : null}
            </div>
            {serverError ? <Notice tone="error">{serverError}</Notice> : null}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5">
              <Field label="Club assessment weight" error={errors.assessment}>
                <Controller
                  control={form.control}
                  name="assessment"
                  render={({ field }) => (
                    <PercentInput
                      ref={field.ref}
                      name={field.name}
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(event) => change('assessment', event.target.value)}
                      invalid={Boolean(errors.assessment || errors.total)}
                    />
                  )}
                />
              </Field>
              <Field label="Match performance weight" error={errors.performance}>
                <Controller
                  control={form.control}
                  name="performance"
                  render={({ field }) => (
                    <PercentInput
                      ref={field.ref}
                      name={field.name}
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(event) => change('performance', event.target.value)}
                      invalid={Boolean(errors.performance || errors.total)}
                    />
                  )}
                />
              </Field>
            </div>
            <div className="flex flex-col gap-1.5">
              <WeightSplitBar assessment={assessment} performance={performance} />
              <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
                <span>
                  Total{' '}
                  <span className={cn('font-mono font-semibold', total !== 100 && 'text-error')}>
                    {total}%
                  </span>
                </span>
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={Boolean(errors.assessment)}
                  onClick={() => change('performance', String(100 - assessment))}
                >
                  Set performance to {errors.assessment ? '—' : `${100 - assessment}%`}
                </Button>
              </div>
              {errors.total ? (
                <span role="alert" className="text-[13px] font-semibold text-error">
                  {errors.total}
                </span>
              ) : null}
            </div>
            <Field
              label="Recent complete standard matches for the overall leaderboard"
              hint="Counted over the last three months. Not the same as the five sessions needed for Most Improved or Off Day."
              error={errors.threshold}
              className="max-w-[320px]"
            >
              <Controller
                control={form.control}
                name="threshold"
                render={({ field }) => (
                  <TextInput
                    ref={field.ref}
                    name={field.name}
                    value={field.value}
                    onBlur={field.onBlur}
                    inputMode="numeric"
                    onChange={(event) => change('threshold', event.target.value)}
                  />
                )}
              />
            </Field>
            <div className="flex flex-wrap justify-end gap-2.5">
              <Button disabled={!dirty} onClick={onDiscard}>
                Discard draft
              </Button>
              <Button type="submit" variant="primary" disabled={!dirty || !valid || locked}>
                Review changes
              </Button>
            </div>
          </form>
        </FormProvider>
      </section>
    </Card>
  )
}
