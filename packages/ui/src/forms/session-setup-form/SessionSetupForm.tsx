'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { Notice } from '@rotra/ui/notice'
import type { RepeatOccurrence } from '@rotra/ui/repeat-schedule-panel'
import { type SetupStep, SetupStepBar } from '@rotra/ui/setup-step-bar'
import { type ReactNode, type Ref, useImperativeHandle, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { sessionSetupDefaultValues } from './SessionSetupForm.defaultValues'
import { slotBudget } from './SessionSetupForm.helpers'
import {
  PAGE_FIELDS,
  type SessionSetupInput,
  type SessionSetupValues,
  STEP_ERROR,
  sessionSetupSchema,
} from './SessionSetupForm.schema'
import { SetupCourtsSection } from './setup-courts-section/SetupCourtsSection'
import { SetupDetailsSection } from './setup-details-section/SetupDetailsSection'
import { SetupFormatsSection } from './setup-formats-section/SetupFormatsSection'
import { SetupMinimumSection } from './setup-minimum-section/SetupMinimumSection'
import { SetupNotesReviewSection } from './setup-notes-review-section/SetupNotesReviewSection'

export type SetupEstimate = { low: number; high: number; usable: number }

/** Lets the container set what its dialogs chose (date, venue) without owning the form state. */
export type SessionSetupFormHandle = {
  setDate: (ymd: string) => void
  setVenue: (venue: SessionSetupInput['venue']) => void
  getValues: () => SessionSetupInput
}

export type SessionSetupFormProps = {
  mode: 'create' | 'edit'
  initialValues?: Partial<SessionSetupInput>
  /** The club's default players per court, used for new sessions */
  playersPerCourtDefault?: number
  clubName: string
  offline?: boolean
  isPending?: boolean
  /** Why the last save failed; a clash returns to page 1 */
  serverError?: string
  onSubmit: (values: SessionSetupValues) => void
  onCancel: () => void
  onOpenDatePicker: (current: string) => void
  onOpenVenuePicker: (currentVenueId: string) => void
  onViewClash: (sessionId: string) => void
  /** The rule from @rotra/data: the dates of the series (one when not repeating) with clashes */
  getOccurrences: (values: SessionSetupInput) => RepeatOccurrence[]
  /** The rule from @rotra/data: the minimum-games estimate for the current values */
  computeEstimate: (values: SessionSetupInput, players: number) => SetupEstimate
  /** Editing a prepared session: roster size (replaces expected players) and the waitlist */
  editContext?: { rosterCount: number; waitlistCount: number }
  /** Page 3 › Financials slot (Queue › Financials) */
  financialsSection?: ReactNode
  /** Adds a Costs row to the review (Queue › Financials) */
  costsReviewLine?: string
  ref?: Ref<SessionSetupFormHandle>
}

const STEPS = ['Date, venue and courts', 'Formats, mode and minimum', 'Costs and review']
const PARTS = [
  ['Details', 'Courts'],
  ['Formats and mode', 'Minimum games'],
  ['Financials', 'Notes and review'],
]

/**
 * Q-SETUP: the three-page session setup wizard. Only page 1 is required; Create session works from
 * any page and the rest uses defaults. Pickers and clash summaries are the container's dialogs.
 */
export function SessionSetupForm({
  mode,
  initialValues,
  playersPerCourtDefault = 8,
  clubName,
  offline,
  isPending,
  serverError,
  onSubmit,
  onCancel,
  onOpenDatePicker,
  onOpenVenuePicker,
  onViewClash,
  getOccurrences,
  computeEstimate,
  editContext,
  financialsSection,
  costsReviewLine,
  ref,
}: SessionSetupFormProps) {
  const form = useForm<SessionSetupInput, unknown, SessionSetupValues>({
    resolver: zodResolver(sessionSetupSchema),
    defaultValues: { ...sessionSetupDefaultValues(playersPerCourtDefault), ...initialValues },
    mode: 'onSubmit',
  })
  const [page, setPage] = useState(0)
  const [visited, setVisited] = useState<Set<number>>(
    () => new Set(mode === 'edit' ? [0, 1, 2] : [0]),
  )
  const [stepError, setStepError] = useState(false)

  useImperativeHandle(ref, () => ({
    setDate: (ymd) => form.setValue('date', ymd, { shouldDirty: true, shouldValidate: true }),
    setVenue: (venue) => form.setValue('venue', venue, { shouldDirty: true, shouldValidate: true }),
    getValues: () => form.getValues(),
  }))

  const values = form.watch()
  const occurrences = getOccurrences(values)
  const repeating = mode === 'create' && values.repeat !== 'none'
  const clashBlocks = repeating ? occurrences.every((o) => o.clash) : Boolean(occurrences[0]?.clash)

  // Which pages the schema finds invalid right now, so the step bar can show "needs details".
  const parsed = sessionSetupSchema.safeParse(values)
  const invalidPages = new Set<number>()
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]) as keyof SessionSetupInput
      const index = PAGE_FIELDS.findIndex((fields) => fields.includes(key))
      if (index >= 0) invalidPages.add(index)
    }
  }
  if (clashBlocks) invalidPages.add(0)

  const steps: SetupStep[] = STEPS.map((label, index) => ({
    label,
    state:
      index === page
        ? 'current'
        : !visited.has(index)
          ? 'todo'
          : invalidPages.has(index)
            ? 'warn'
            : 'done',
  }))

  const goTo = (next: number) => {
    setVisited((v) => new Set(v).add(page).add(next))
    setStepError(false)
    setPage(next)
  }
  const validatePage = async (index: number) => {
    const ok = await form.trigger(PAGE_FIELDS[index] ?? [])
    const blocked = index === 0 && clashBlocks
    setStepError(!ok || blocked)
    return ok && !blocked
  }
  const next = async () => {
    if (await validatePage(page)) goTo(page + 1)
  }
  const submit = form.handleSubmit(
    (parsedValues) => {
      if (clashBlocks) {
        setStepError(true)
        goTo(0)
        return
      }
      if (!isPending && !offline)
        onSubmit({
          ...parsedValues,
          minimumGames: parsedValues.minimumIsCalculated
            ? String(estimatedMinimum)
            : parsedValues.minimumGames,
        })
    },
    (errors) => {
      const first = PAGE_FIELDS.findIndex((fields) => fields.some((f) => f in errors))
      setStepError(true)
      if (first >= 0) goTo(first)
    },
  )

  const expected = Number(values.expectedPlayers)
  const estimatedMinimum = computeEstimate(
    values,
    editContext?.rosterCount ||
      (Number.isInteger(expected) && expected > 0 ? expected : slotBudget(values)),
  ).low
  const last = STEPS.length - 1
  const saveLabel = mode === 'edit' ? 'Save changes' : 'Create session'
  const sections: ReactNode[] = [
    <SetupDetailsSection
      key="details"
      mode={mode}
      occurrences={occurrences}
      onOpenDatePicker={() => onOpenDatePicker(values.date)}
      onOpenVenuePicker={() => onOpenVenuePicker(values.venue.venueId)}
      onViewClash={onViewClash}
    />,
    <SetupCourtsSection key="courts" editContext={editContext} />,
    <SetupFormatsSection key="formats" />,
    <SetupMinimumSection
      key="minimum"
      computeEstimate={computeEstimate}
      rosterCount={editContext?.rosterCount}
    />,
    financialsSection ?? null,
    <SetupNotesReviewSection
      key="review"
      mode={mode}
      occurrences={occurrences}
      estimatedMinimum={estimatedMinimum}
      onEditPage={goTo}
      costsReviewLine={costsReviewLine}
    />,
  ]

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h1>{mode === 'edit' ? 'Edit preparation' : 'Create session'}</h1>
          <p className="m-0 text-[13px] text-fg2">
            For {clubName}. Saving needs an internet connection.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <SetupStepBar steps={steps} onSelect={goTo} />
          <p className="m-0 text-xs text-fg2">
            {mode === 'edit'
              ? 'Tap any step to jump to it.'
              : 'Only page 1 is required. Create session works from any page; the rest uses sensible defaults you can change later.'}{' '}
            Finished steps glow green.
          </p>
        </div>
        {offline ? (
          <Notice tone="warn">
            You're offline. You can fill this in, but it isn't saved until you reconnect. A draft
            can't be run offline.
          </Notice>
        ) : null}
        {stepError ? <Notice tone="error">{STEP_ERROR}</Notice> : null}
        {serverError ? <Notice tone="error">{serverError}</Notice> : null}
        <Card asChild>
          <section aria-labelledby="setup-page-title" className="flex flex-col gap-3">
            <div>
              <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
                Step {page + 1} of {STEPS.length}
              </span>
              <h2 id="setup-page-title">{STEPS[page]}</h2>
            </div>
            {[page * 2, page * 2 + 1].map((k, n) => {
              const content = sections[k]
              if (content === null && k === 4) return null
              return (
                <div
                  key={k}
                  className={cn(
                    'flex flex-col gap-3.5',
                    n === 1 && sections[k - 1] !== null && 'mt-1 border-t border-border pt-[18px]',
                  )}
                >
                  <h3 className="text-[13px] tracking-[0.06em] text-fg2 uppercase">
                    {PARTS[page]?.[n]}
                  </h3>
                  {content}
                </div>
              )
            })}
          </section>
        </Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button onClick={page === 0 ? onCancel : () => goTo(page - 1)}>
            {page === 0 ? 'Cancel' : 'Back'}
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {page !== last ? (
              <Button type="submit" disabled={offline || isPending} loading={isPending}>
                {saveLabel}
              </Button>
            ) : null}
            {page === last ? (
              <Button
                type="submit"
                variant="primary"
                disabled={offline || isPending}
                loading={isPending}
              >
                {saveLabel}
              </Button>
            ) : (
              <Button variant="primary" onClick={next}>
                Next
              </Button>
            )}
          </div>
        </div>
      </form>
    </FormProvider>
  )
}
