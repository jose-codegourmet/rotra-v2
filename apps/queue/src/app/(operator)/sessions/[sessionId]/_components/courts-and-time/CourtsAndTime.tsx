'use client'

import { openedEarly } from '@rotra/data/match/match.rules'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { MockError } from '@rotra/data/mock/errors'
import { useAddCourt } from '@rotra/data/queue-session/useAddCourt'
import { useExtendSession } from '@rotra/data/queue-session/useExtendSession'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSetSessionEnd } from '@rotra/data/queue-session/useSetSessionEnd'
import { useUpdateCourt } from '@rotra/data/queue-session/useUpdateCourt'
import {
  CourtsAndTimeSheet,
  type CourtsTimeStatus,
  type ExtendMinutes,
} from '@rotra/ui/courts-and-time-sheet'
import { AddCourtForm } from '@rotra/ui/forms/add-court-form'
import { nextCourtLabel, toTimeInput } from '@rotra/ui/forms/add-court-form/default-values'
import type { AddCourtFormValues } from '@rotra/ui/forms/add-court-form/schema'
import { toast } from '@rotra/ui/toaster'
import { useRef, useState } from 'react'

/** The two sheets this container owns; the shell keeps them in its one `sheet` state */
export type CourtsAndTimeSheetValue = 'adjust' | 'add-court'

export type CourtsAndTimeProps = {
  sessionId: string
  /** Which sheet is open: Courts and time (Courts and time) or Add a court; null when neither */
  open: CourtsAndTimeSheetValue | null
  onOpenChange: (sheet: CourtsAndTimeSheetValue | null) => void
  /** Edit in a court card's ⋯ menu: open the Add a court sheet on this court */
  editCourtId?: string | null
  /** Opened from the overdue banner's Set end time: focus the New end picker */
  focusEnd?: boolean
  /** The console clock, so "Ends …" and the overdue text stay in step with the header */
  now?: number
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/** A save that could not be made durable on this device ("Changes could not be saved") or offline */
const isSaveFailure = (error: unknown) =>
  error instanceof MockError && (error.kind === 'retryable' || error.kind === 'offline')

/**
 * Q-SESSION-ADJUST and Q-ADD-COURT: the Courts and time sheet (one row per court with its Playing /
 * Getting ready / Free chip, booking line and Change time) on useSetSessionEnd and useExtendSession ("Session ends at
 * HH:MM · public page updates after sync") and the Add a court sheet on useAddCourt ("LABEL added · open until HH:MM"). "Add a court…"
 * in the first opens the second; the shell's + Add court tile opens it directly. Courts set to
 * "until the session ends" follow an extension (their openUntil is null); set-time courts keep theirs.
 * A save failure is an error toast (the sheet stays open with what was typed, nothing is claimed);
 * any other refusal shows inside the add sheet.
 */
export function CourtsAndTime({
  sessionId,
  open,
  onOpenChange,
  editCourtId = null,
  focusEnd = false,
  now,
}: CourtsAndTimeProps) {
  const saving = useRef(false)
  const returnFocus = useRef<HTMLElement | null>(null)
  const previousOpen = useRef(open)
  if (open === 'adjust' && previousOpen.current !== open && typeof document !== 'undefined')
    returnFocus.current = document.activeElement as HTMLElement
  previousOpen.current = open
  const session = useQueueSession(sessionId)
  const extend = useExtendSession()
  const setEnd = useSetSessionEnd()
  const add = useAddCourt()
  const update = useUpdateCourt()
  const matches = useSessionMatches(sessionId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | undefined>()

  const s = session.data
  if (!s) return null
  const sessionStart = s.startedAt ?? s.scheduledStartAt
  const courts = s.courts
  const editing = courts.find((c) => c.id === (editingId ?? editCourtId))
  // The planned start is fixed once the court hosted a match or was opened early; the end and the
  // label stay editable, even while a match is on the court (the match is not touched).
  const used =
    !!editing &&
    (editing.openedEarlyAt != null ||
      (matches.data ?? []).some((m) => m.courtIds.includes(editing.id)))

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

  const onSetEndTime = (endAt: number) => {
    if (saving.current) return
    saving.current = true
    setEnd.mutate(
      { sessionId, endAt },
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
        courts={courts.map((c) => {
          const onIt = (matches.data ?? []).filter((m) => m.courtIds.includes(c.id))
          const status: CourtsTimeStatus = onIt.some((m) => m.state === 'active')
            ? 'playing'
            : onIt.some((m) => m.state === 'on_court')
              ? 'getting-ready'
              : 'free'
          return {
            ...c,
            startsAt: c.startsAt ?? sessionStart,
            status,
            openedEarly: openedEarly(c, now),
            occupied: status !== 'free',
            used: onIt.length > 0 || c.openedEarlyAt != null,
          }
        })}
        startsAt={sessionStart}
        now={now}
        focusEnd={focusEnd}
        onSetEndTime={onSetEndTime}
        onNewEndChange={() => {
          setServerError(undefined)
          setEnd.reset()
        }}
        endTimeError={setEnd.error ? errorMessage(setEnd.error) : undefined}
        serverError={serverError ?? (extend.error ? errorMessage(extend.error) : undefined)}
        onEditCourt={(id) => {
          setServerError(undefined)
          setEditingId(id)
          onOpenChange('add-court')
        }}
        endsAt={s.scheduledEndAt}
        onAddCourt={() => openAddCourt(true)}
        onExtend={onExtend}
        isPending={extend.isPending || setEnd.isPending || matches.isPending}
      />
      {/* Remounted on each open so the label and mode start fresh from the current court count */}
      <AddCourtForm
        key={open === 'add-court' ? `open-${editing?.id ?? 'new'}` : 'closed'}
        open={open === 'add-court'}
        onOpenChange={openAddCourt}
        defaultLabel={editing?.label ?? nextCourtLabel(courts.length)}
        editing={!!editing}
        returnFocusRef={returnFocus}
        lockedStartsAt={editing && used ? (editing.startsAt ?? sessionStart) : undefined}
        defaultValues={
          editing
            ? {
                label: editing.label,
                startTime: toTimeInput(editing.startsAt ?? sessionStart),
                mode: editing.openUntil === null ? 'end' : 'time',
                time: toTimeInput(editing.openUntil ?? s.scheduledEndAt),
              }
            : undefined
        }
        sessionStartsAt={
          editing ? Math.min(sessionStart, editing.startsAt ?? sessionStart) : sessionStart
        }
        sessionEndsAt={s.scheduledEndAt}
        onSubmit={onAdd}
        isPending={add.isPending || update.isPending || matches.isPending}
        serverError={serverError}
        onCancel={() => openAddCourt(false)}
      />
    </>
  )
}
