'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@rotra/ui/button'
import { Checkbox } from '@rotra/ui/checkbox'
import { cn } from '@rotra/ui/cn'
import { listNames } from '@rotra/ui/forms/match-result-form/default-values'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import { useId } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { publishResultsFormDefaultValues } from './PublishResultsForm.defaultValues'
import {
  type PublishResultsFormInput,
  type PublishResultsFormValues,
  publishResultsSchema,
} from './PublishResultsForm.schema'

export type PublishResultsFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * The starting selection: publishResultsFormDefaultValues(previous). Include Off Day is reset to
   * off on every mount regardless of what is passed here.
   */
  defaultValues?: Partial<PublishResultsFormInput>
  /** Who the Off Day slide would show publicly; empty when no one had an off day */
  offDayNames: string[]
  /** Players in the standings: "N players" */
  standingsCount: number
  /** Awards names a Most Improved as well as the MVP */
  hasMostImproved: boolean
  /** Publishing needs internet: offline disables the primary action */
  online: boolean
  onSubmit: (values: PublishResultsFormValues) => void
  /** The publish is running: submit is disabled so one tap cannot publish twice */
  isPending?: boolean
  /** Why the publish failed; the previous publication and the selection stay as they are */
  serverError?: string
  /** Back to private review; defaults to closing the sheet */
  onBack?: () => void
}

/**
 * Q-PUBLISH / D-PUBLISH: the Publish results sheet. Audience "anyone with the session link", the
 * Standings and Awards choices, the explicit Include Off Day opt-in with the names it would show
 * (D-OFF-DAY, warn border, always off on open), the ranks note and the offline notice. Publish
 * selected results needs at least one choice and a connection. The container owns the
 * usePublishResults mutation and its "Results published to the session page" toast.
 */
export function PublishResultsForm({
  open,
  onOpenChange,
  defaultValues,
  offDayNames,
  standingsCount,
  hasMostImproved,
  online,
  onSubmit,
  isPending = false,
  serverError,
  onBack,
}: PublishResultsFormProps) {
  const formId = useId()
  const errorId = `${formId}-selection-error`
  const form = useForm<PublishResultsFormInput, unknown, PublishResultsFormValues>({
    resolver: zodResolver(publishResultsSchema),
    defaultValues: {
      ...publishResultsFormDefaultValues(),
      ...defaultValues,
      // D-OFF-DAY: never carried over from a previous publication, whatever the caller passes.
      includeOffDay: false,
    },
  })
  const { errors } = form.formState
  const [standings, awards, includeOffDay] = form.watch(['standings', 'awards', 'includeOffDay'])
  const nothingChosen = !standings && !awards && !includeOffDay
  const selectionError = errors.standings?.message

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title="Publish results"
      dismissible={!isPending}
      footer={
        <>
          <Button disabled={isPending} onClick={onBack ?? (() => onOpenChange(false))}>
            Back to private review
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            loading={isPending}
            disabled={nothingChosen || !online}
          >
            Publish selected results
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
            if (!isPending && online) onSubmit(values)
          })}
        >
          {serverError ? <Notice tone="error">{serverError}</Notice> : null}
          <p className="m-0 text-[13px]">
            Audience: <b>anyone with the session link</b>.
          </p>
          <fieldset
            aria-label="What to publish"
            aria-describedby={selectionError ? errorId : undefined}
            className="m-0 flex flex-col gap-2.5 border-0 p-0"
          >
            <Controller
              control={form.control}
              name="standings"
              render={({ field }) => (
                <Checkbox
                  ref={field.ref}
                  name={field.name}
                  label="Standings"
                  description={`${standingsCount} player${standingsCount === 1 ? '' : 's'}`}
                  checked={field.value}
                  onChange={(checked) => {
                    field.onChange(checked)
                    form.clearErrors('standings')
                  }}
                  onBlur={field.onBlur}
                  disabled={isPending}
                />
              )}
            />
            <Controller
              control={form.control}
              name="awards"
              render={({ field }) => (
                <Checkbox
                  ref={field.ref}
                  name={field.name}
                  label="Awards"
                  description={hasMostImproved ? 'MVP and Most Improved' : 'MVP'}
                  checked={field.value}
                  onChange={(checked) => {
                    field.onChange(checked)
                    form.clearErrors('standings')
                  }}
                  onBlur={field.onBlur}
                  disabled={isPending}
                />
              )}
            />
            <Controller
              control={form.control}
              name="includeOffDay"
              render={({ field }) => (
                <Checkbox
                  ref={field.ref}
                  name={field.name}
                  label="Include Off Day"
                  description={
                    offDayNames.length
                      ? `Shows ${listNames(offDayNames)} publicly. Off by default.`
                      : 'Empty for this session. Off by default.'
                  }
                  checked={field.value}
                  onChange={(checked) => {
                    field.onChange(checked)
                    form.clearErrors('standings')
                  }}
                  onBlur={field.onBlur}
                  disabled={isPending}
                  className="border-warn"
                />
              )}
            />
            <span
              id={errorId}
              aria-live="polite"
              className={cn('text-[13px] font-semibold text-error', !selectionError && 'hidden')}
            >
              {selectionError}
            </span>
          </fieldset>
          <p className="m-0 text-[13px] text-fg2">
            Player ranks already updated; publishing doesn't change them.
          </p>
          {online ? null : <Notice tone="offline">Publishing needs internet.</Notice>}
        </form>
      </FormProvider>
    </Sheet>
  )
}
