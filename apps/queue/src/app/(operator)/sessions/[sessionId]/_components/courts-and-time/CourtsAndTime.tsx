'use client'

import { useAddCourt } from '@rotra/data/queue-session/useAddCourt'
import { useExtendSession } from '@rotra/data/queue-session/useExtendSession'
import { MockError } from '@rotra/data/mock/errors'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { CourtsAndTimeSheet, type ExtendMinutes } from '@rotra/ui/courts-and-time-sheet'
import { AddCourtForm } from '@rotra/ui/forms/add-court-form'
import { nextCourtLabel } from '@rotra/ui/forms/add-court-form/default-values'
import type { AddCourtFormValues } from '@rotra/ui/forms/add-court-form/schema'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'

/** The two sheets this container owns; the shell keeps them in its one `sheet` state */
export type CourtsAndTimeSheetValue = 'adjust' | 'add-court'

export type CourtsAndTimeProps = {
  sessionId: string
  /** Which sheet is open: Courts and time (Extend time) or Add a court; null when neither */
  open: CourtsAndTimeSheetValue | null
  onOpenChange: (sheet: CourtsAndTimeSheetValue | null) => void
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/** A save that could not be made durable on this device ("Changes could not be saved") or offline */
const isSaveFailure = (error: unknown) =>
  error instanceof MockError && (error.kind === 'retryable' || error.kind === 'offline')

/**
 * Q-SESSION-ADJUST and Q-ADD-COURT: the Courts and time sheet on useExtendSession ("Session now ends
 * HH:MM") and the Add a court sheet on useAddCourt ("LABEL added · open until HH:MM"). "Add a court…"
 * in the first opens the second; the shell's + Add court tile opens it directly. Courts set to
 * "until the session ends" follow an extension (their openUntil is null); set-time courts keep theirs.
 * A save failure is an error toast (the sheet stays open with what was typed, nothing is claimed);
 * any other refusal shows inside the add sheet.
 */
export function CourtsAndTime({ sessionId, open, onOpenChange }: CourtsAndTimeProps) {
  const session = useQueueSession(sessionId)
  const extend = useExtendSession()
  const add = useAddCourt()
  const [serverError, setServerError] = useState<string | undefined>()

  const s = session.data
  if (!s) return null
  const courts = s.courts

  const onExtend = (minutes: ExtendMinutes) =>
    extend.mutate(
      { sessionId, minutes },
      {
        onSuccess: (result) => toast(result.message),
        onError: (error) => toast.error(errorMessage(error)),
      },
    )

  const onAdd = (values: AddCourtFormValues) => {
    setServerError(undefined)
    add.mutate(
      { sessionId, label: values.label, openUntil: values.openUntil },
      {
        onSuccess: (result) => {
          toast(result.message)
          onOpenChange(null)
        },
        onError: (error) => {
          if (isSaveFailure(error)) toast.error(errorMessage(error))
          else setServerError(errorMessage(error))
        },
      },
    )
  }

  const openAddCourt = (next: boolean) => {
    if (!next) setServerError(undefined)
    onOpenChange(next ? 'add-court' : null)
  }

  return (
    <>
      <CourtsAndTimeSheet
        open={open === 'adjust'}
        onOpenChange={(next) => onOpenChange(next ? 'adjust' : null)}
        courts={courts}
        endsAt={s.scheduledEndAt}
        onAddCourt={() => openAddCourt(true)}
        onExtend={onExtend}
        isPending={extend.isPending}
      />
      {/* Remounted on each open so the label and mode start fresh from the current court count */}
      <AddCourtForm
        key={open === 'add-court' ? 'open' : 'closed'}
        open={open === 'add-court'}
        onOpenChange={openAddCourt}
        defaultLabel={nextCourtLabel(courts.length)}
        sessionStartsAt={s.startedAt ?? s.scheduledStartAt}
        sessionEndsAt={s.scheduledEndAt}
        onSubmit={onAdd}
        isPending={add.isPending}
        serverError={serverError}
        onCancel={() => openAddCourt(false)}
      />
    </>
  )
}
