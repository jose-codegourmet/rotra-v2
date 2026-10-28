'use client'

import { MockError } from '@rotra/data/mock/errors'
import { queueSessionKeys } from '@rotra/data/queue-session/query-keys'
import {
  FINALIZATION_STAGES,
  type FinalizationStage,
  type SessionFinalization,
} from '@rotra/data/queue-session/types'
import { useFinalizationStatus } from '@rotra/data/queue-session/useFinalizationStatus'
import { useFinalizeSession } from '@rotra/data/queue-session/useFinalizeSession'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { FinalizeProgress, type FinalizeStage } from '@rotra/ui/finalize-progress'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useIsMutating } from '@tanstack/react-query'
import { notFound, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { sessionHref } from '@/lib/dates'

export type FinalizeProgressScreenProps = { sessionId: string }

/** The four UI stages of Q-FINALIZE-PROGRESS, in the order the mock finalization runs them. */
const STAGE_LABELS: Record<FinalizationStage, string> = {
  checking: 'Checking session records',
  finishing: 'Finishing the session',
  player_records: 'Updating player records',
  slides: 'Preparing result slides',
}

const DONE_TOAST = 'Session finished · player records updated'
const PREPARING = 'Session finished; results are being prepared'
const NOT_FINISHED = 'The session was not finished. It is still running.'
const FAILED_BEFORE_COMMIT = "Finishing didn't complete. Nothing was finished; try again."
const FAILED_AFTER_COMMIT =
  "Some finishing work didn't complete. The session stays finished; try again to finish the rest."

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/** Marks each stage done, current or pending from the finalization status; all pending before it starts. */
function toStages(finalization: SessionFinalization | null): FinalizeStage[] {
  const reached =
    finalization === null
      ? -1
      : finalization.state === 'done'
        ? FINALIZATION_STAGES.length
        : FINALIZATION_STAGES.indexOf(finalization.failedStage ?? finalization.stage)
  return FINALIZATION_STAGES.map((stage, index) => ({
    label: STAGE_LABELS[stage],
    status: index < reached ? 'done' : index === reached ? 'current' : 'pending',
  }))
}

/**
 * Q-FINALIZE-PROGRESS: "Finishing TITLE" with the four stages from useFinalizationStatus, which
 * polls while the finalization runs (and while the Session done request is still in flight). No
 * left nav or dock on this screen. When the status is done the results view replaces this route
 * and the toast "Session finished · player records updated" shows, once, so browser Back never
 * re-runs anything.
 *
 * Failure states (Q07.7): a run that failed before commit keeps the session running and shows
 * Try again; a run that committed but failed later announces "Session finished; results are being
 * prepared" and Try again re-runs only the outstanding stages with the same commandId. On load the
 * status is always read before any retry is offered (a lost response never resubmits blindly), and
 * a session that is not finishing goes back to its console, preparation or record.
 */
export function FinalizeProgressScreen({ sessionId }: FinalizeProgressScreenProps) {
  const router = useRouter()
  const session = useQueueSession(sessionId)
  const inFlight = useIsMutating({ mutationKey: queueSessionKeys.finalize(sessionId) }) > 0
  const status = useFinalizationStatus(sessionId, { poll: inFlight })
  const finalize = useFinalizeSession(sessionId)
  // Only a visit that watched the run toasts on completion; reopening a finished run just moves on.
  const watched = useRef(false)
  const left = useRef(false)

  if (session.isError && session.error instanceof MockError && session.error.kind === 'permission')
    notFound()

  const s = session.data
  const finalization = status.data ?? null
  if (inFlight || (finalization && finalization.state !== 'done')) watched.current = true

  // Where this route belongs, decided only from settled, fresh data (never mid-request).
  const settled = !!s && status.isSuccess && !inFlight && !status.isFetching && !session.isFetching
  const target = !settled
    ? null
    : s.state === 'invalid'
      ? `/sessions/${sessionId}/record`
      : s.state === 'completed' && finalization?.state !== 'committed'
        ? `/sessions/${sessionId}/results`
        : (s.state === 'active' || s.state === 'prepared') && finalization?.state !== 'failed'
          ? sessionHref(s)
          : null

  useEffect(() => {
    if (!target || left.current) return
    left.current = true
    if (target.endsWith('/results') && watched.current) toast(DONE_TOAST)
    router.replace(target)
  }, [target, router])

  const retry = () => {
    if (!finalization || finalize.isPending) return
    finalize
      .mutateAsync({ sessionId, commandId: finalization.commandId })
      .catch((error: unknown) => toast.error(errorMessage(error)))
  }

  const failedBeforeCommit =
    settled && finalization?.state === 'failed' && s.state === 'active' && !finalize.isPending
  const failedAfterCommit = settled && finalization?.state === 'committed' && !finalize.isPending

  return (
    <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[120px]">
      {session.isError ? (
        <QueryError query={session} title="Couldn't load this session." />
      ) : !s || target ? (
        <div
          role="status"
          aria-busy
          aria-label="Loading the session"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      ) : (
        <FinalizeProgress
          sessionTitle={s.title}
          stages={toStages(finalization)}
          statusLine={
            failedBeforeCommit
              ? NOT_FINISHED
              : finalization?.state === 'committed'
                ? PREPARING
                : undefined
          }
          error={
            failedBeforeCommit || failedAfterCommit
              ? {
                  message: failedBeforeCommit ? FAILED_BEFORE_COMMIT : FAILED_AFTER_COMMIT,
                  onRetry: retry,
                  retrying: finalize.isPending,
                }
              : undefined
          }
        />
      )}
    </main>
  )
}
