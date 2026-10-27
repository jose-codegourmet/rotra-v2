'use client'

import { MockError } from '@rotra/data/mock/errors'
import {
  FINALIZATION_STAGES,
  type FinalizationStage,
  type SessionFinalization,
} from '@rotra/data/queue-session/types'
import { useFinalizationStatus } from '@rotra/data/queue-session/useFinalizationStatus'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { FinalizeProgress, type FinalizeStage } from '@rotra/ui/finalize-progress'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { notFound, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'

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
 * polls while the finalization runs. No left nav or dock on this screen (the operator shell renders
 * it bare, as it does the license gate). When the status is done the results view replaces this
 * route and the toast "Session finished · player records updated" shows, once, so browser Back
 * never re-runs anything. A committed finalization whose later work is still outstanding announces
 * "Session finished; results are being prepared"; its retry arrives with the failure states ticket.
 */
export function FinalizeProgressScreen({ sessionId }: FinalizeProgressScreenProps) {
  const router = useRouter()
  const session = useQueueSession(sessionId)
  const status = useFinalizationStatus(sessionId)
  const finished = useRef(false)

  if (session.isError && session.error instanceof MockError && session.error.kind === 'permission')
    notFound()

  const finalization = status.data ?? null
  const done = finalization?.state === 'done'
  useEffect(() => {
    if (!done || finished.current) return
    finished.current = true
    toast(DONE_TOAST)
    router.replace(`/sessions/${sessionId}/results`)
  }, [done, router, sessionId])

  const s = session.data
  return (
    <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[120px]">
      {session.isError ? (
        <QueryError query={session} title="Couldn't load this session." />
      ) : !s ? (
        <div aria-busy aria-label="Loading the session" className="flex flex-col gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      ) : (
        <FinalizeProgress
          sessionTitle={s.title}
          stages={toStages(finalization)}
          statusLine={finalization?.state === 'committed' ? PREPARING : undefined}
        />
      )}
    </main>
  )
}
