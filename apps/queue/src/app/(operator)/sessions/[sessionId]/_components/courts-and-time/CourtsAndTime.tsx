'use client'

import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { useUpdateCourt } from '@rotra/data/queue-session/useUpdateCourt'
import { useRemoveCourt } from '@rotra/data/queue-session/useRemoveCourt'
import { toTimeInput } from '@rotra/ui/forms/add-court-form/default-values'
import { MockError } from '@rotra/data/mock/errors'
import { useAddCourt } from '@rotra/data/queue-session/useAddCourt'
import { useExtendSession } from '@rotra/data/queue-session/useExtendSession'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { CourtsAndTimeSheet, type ExtendMinutes } from '@rotra/ui/courts-and-time-sheet'
import { AddCourtForm } from '@rotra/ui/forms/add-court-form'
import { nextCourtLabel } from '@rotra/ui/forms/add-court-form/default-values'
import type { AddCourtFormValues } from '@rotra/ui/forms/add-court-form/schema'
import { toast } from '@rotra/ui/toaster'
import { useRef, useState } from 'react'

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
  const saving = useRef(false)
  const returnFocus = useRef<HTMLElement | null>(null)
  const previousOpen = useRef(open)
  if (open === 'adjust' && previousOpen.current !== open && typeof document !== 'undefined')
    returnFocus.current = document.activeElement as HTMLElement
  previousOpen.current = open
  const session = useQueueSession(sessionId)
  const extend = useExtendSession()
  const add = useAddCourt()
  const update = useUpdateCourt()
  const remove = useRemoveCourt()
  const matches = useSessionMatches(sessionId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | undefined>()

  const s = session.data
  if (!s) return null
  const courts = s.courts
  const editing = courts.find((c) => c.id === editingId)
  const used = !!editing && (matches.data ?? []).some((m) => m.courtIds.includes(editing.id))

  const onExtend = (minutes: ExtendMinutes) => {
    if (saving.current) return
    saving.current = true
    extend.mutate(
      { sessionId, minutes },
      {
        onSuccess: (result) => {
          setServerError(undefined)
          toast(result.message)
        },
        onError: (error) => setServerError(errorMessage(error)),
        onSettled: () => {
          saving.current = false
        },
      },
    )
  }

  const onAdd = (values: AddCourtFormValues) => {
    if (saving.current) return
    saving.current = true
    setServerError(undefined)
    const options = {
      onSettled: () => {
        saving.current = false
      },
      onSuccess: (result: { message: string }) => {
        toast(result.message)
        setEditingId(null)
        onOpenChange(null)
      },
      onError: (error: unknown) => {
        setServerError(errorMessage(error))
        if (isSaveFailure(error)) toast.error(errorMessage(error))
      },
    }
    if (editing) update.mutate({ sessionId, courtId: editing.id, ...values }, options)
    else add.mutate({ sessionId, ...values }, options)
  }

  const openAddCourt = (next: boolean) => {
    if (!next) {
      setServerError(undefined)
      setEditingId(null)
    }
    onOpenChange(next ? 'add-court' : null)
  }

  return (
    <>
      <CourtsAndTimeSheet
        open={open === 'adjust'}
        onOpenChange={(next) => onOpenChange(next ? 'adjust' : null)}
        courts={courts.map((c) => ({
          ...c,
          startsAt: c.startsAt ?? s.scheduledStartAt,
          occupied: (matches.data ?? []).some(
            (m) => m.state === 'active' && m.courtIds.includes(c.id),
          ),
          used: (matches.data ?? []).some((m) => m.courtIds.includes(c.id)),
        }))}
        startsAt={s.scheduledStartAt}
        serverError={serverError ?? (extend.error ? errorMessage(extend.error) : undefined)}
        onEditCourt={(id) => {
          setServerError(undefined)
          setEditingId(id)
          onOpenChange('add-court')
        }}
        onRemoveCourt={(courtId) =>
          remove.mutate(
            { sessionId, courtId },
            {
              onSuccess: (result) => {
                setServerError(undefined)
                toast(result.message)
              },
              onError: (error) => setServerError(errorMessage(error)),
            },
          )
        }
        endsAt={s.scheduledEndAt}
        onAddCourt={() => openAddCourt(true)}
        onExtend={onExtend}
        isPending={extend.isPending || remove.isPending || matches.isPending}
      />
      {/* Remounted on each open so the label and mode start fresh from the current court count */}
      <AddCourtForm
        key={open === 'add-court' ? `open-${editingId ?? 'new'}` : 'closed'}
        open={open === 'add-court'}
        onOpenChange={openAddCourt}
        defaultLabel={editing?.label ?? nextCourtLabel(courts.length)}
        editing={!!editing}
        returnFocusRef={returnFocus}
        lockedStartsAt={editing && used ? (editing.startsAt ?? s.scheduledStartAt) : undefined}
        defaultValues={
          editing
            ? {
                label: editing.label,
                startTime: toTimeInput(editing.startsAt ?? s.scheduledStartAt),
                mode: editing.openUntil === null ? 'end' : 'time',
                time: toTimeInput(editing.openUntil ?? s.scheduledEndAt),
              }
            : undefined
        }
        sessionStartsAt={s.scheduledStartAt}
        sessionEndsAt={s.scheduledEndAt}
        onSubmit={onAdd}
        isPending={add.isPending || update.isPending || matches.isPending}
        serverError={serverError}
        onCancel={() => openAddCourt(false)}
      />
    </>
  )
}
