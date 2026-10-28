'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@rotra/ui/button'
import { ChoiceGroup } from '@rotra/ui/choice-group'
import { cn } from '@rotra/ui/cn'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { useId } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { listNames, matchResultFormDefaultValues } from './MatchResultForm.defaultValues'
import {
  type MatchResultFormInput,
  type MatchResultFormValues,
  matchResultSchema,
  type Team,
} from './MatchResultForm.schema'

export type MatchResultFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The match's number: "Match N result" */
  matchNo: number
  /** Team A's short names in lineup order */
  teamANames: string[]
  /** Team B's short names in lineup order */
  teamBNames: string[]
  /** Review result passed validation: the container opens Confirm match result with these values */
  onSubmit: (values: MatchResultFormValues) => void
  /** The review or confirmation is running: Review result cannot fire twice */
  isPending?: boolean
  /** Why the result could not be taken further; what was typed stays in the fields */
  serverError?: string
  /** Back to the active match; defaults to closing */
  onBack?: () => void
  defaultValues?: Partial<MatchResultFormInput>
}

const HINT = 'Scores are optional. If you enter them, the higher score wins.'
const LABEL_CLASS = 'text-xs font-semibold tracking-[0.5px] text-fg2 uppercase'

/**
 * Q-MATCH-DONE: the "Match N result" sheet. Pick the winner (two choice cards with the names) OR
 * enter the final score (two whole-number fields; blank is no score). Clear scores appears once a
 * score is typed. Review result validates and reports the winner and scores; the container then
 * shows ConfirmResultSheet (D-WINNER) and owns the useCompleteMatch mutation.
 */
export function MatchResultForm({
  open,
  onOpenChange,
  matchNo,
  teamANames,
  teamBNames,
  onSubmit,
  isPending = false,
  serverError,
  onBack,
  defaultValues,
}: MatchResultFormProps) {
  const formId = useId()
  const messageId = `${formId}-result-message`
  const form = useForm<MatchResultFormInput, unknown, MatchResultFormValues>({
    resolver: zodResolver(matchResultSchema),
    defaultValues: { ...matchResultFormDefaultValues, ...defaultValues },
  })
  const { errors } = form.formState
  const [scoreA, scoreB] = form.watch(['scoreA', 'scoreB'])
  const hasScore = scoreA.trim() !== '' || scoreB.trim() !== ''
  const scoreError = errors.scoreA?.message
  const error = errors.winner?.message ?? scoreError

  const clearScores = () => {
    form.setValue('scoreA', '', { shouldDirty: true })
    form.setValue('scoreB', '', { shouldDirty: true })
    form.clearErrors(['scoreA', 'winner'])
  }

  const teamNames: Record<Team, string> = {
    A: listNames(teamANames),
    B: listNames(teamBNames),
  }

  const scoreField = (team: Team, name: 'scoreA' | 'scoreB') => (
    <Field label={`Team ${team} · ${teamNames[team]}`}>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <TextInput
            {...field}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder="0"
            autoComplete="off"
            invalid={Boolean(scoreError)}
            aria-invalid={scoreError ? true : undefined}
            aria-describedby={messageId}
            className="tabular-nums"
            onChange={(event) => {
              field.onChange(event)
              form.clearErrors(['scoreA', 'winner'])
            }}
          />
        )}
      />
    </Field>
  )

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title={`Match ${matchNo} result`}
      dismissible={!isPending}
      footer={
        <>
          <Button disabled={isPending} onClick={onBack ?? (() => onOpenChange(false))}>
            Back
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={isPending}>
            Review result
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form
          id={formId}
          noValidate
          className="flex flex-col gap-3.5"
          onSubmit={form.handleSubmit((values) => {
            if (!isPending) onSubmit(values)
          })}
        >
          {serverError ? <Notice tone="error">{serverError}</Notice> : null}
          <div className="flex min-w-0 flex-col gap-2.5">
            <span className={LABEL_CLASS}>Pick the winner</span>
            <Controller
              control={form.control}
              name="winner"
              render={({ field }) => (
                <ChoiceGroup
                  type="single"
                  aria-label="Pick the winner"
                  value={field.value ?? ''}
                  onChange={(value) => {
                    field.onChange(value as Team)
                    form.clearErrors(['scoreA', 'winner'])
                  }}
                  choices={[
                    { value: 'A', eyebrow: 'Team A', title: teamNames.A },
                    { value: 'B', eyebrow: 'Team B', title: teamNames.B },
                  ]}
                />
              )}
            />
          </div>
          <div className="flex items-center gap-3 text-xs font-extrabold tracking-[2px] text-fg2 before:h-px before:flex-1 before:bg-border-strong after:h-px after:flex-1 after:bg-border-strong">
            <span>OR</span>
          </div>
          <div className="flex min-w-0 flex-col gap-2.5">
            <span className={LABEL_CLASS}>Enter the final score</span>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2.5">
              {scoreField('A', 'scoreA')}
              <span
                aria-hidden="true"
                className="pb-3 text-[11px] font-extrabold tracking-[1px] text-fg3"
              >
                –
              </span>
              {scoreField('B', 'scoreB')}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span
                id={messageId}
                aria-live="polite"
                className={cn(
                  error ? 'text-[13px] font-semibold text-error' : 'text-xs font-normal text-fg2',
                )}
              >
                {error ?? HINT}
              </span>
              {hasScore ? (
                <Button variant="ghost" size="xs" onClick={clearScores}>
                  Clear scores
                </Button>
              ) : null}
            </div>
          </div>
        </form>
      </FormProvider>
    </Sheet>
  )
}
