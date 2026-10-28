'use client'

import { useFinalizeSession } from '@rotra/data/queue-session/useFinalizeSession'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionDoneReview } from '@rotra/data/queue-session/useSessionDoneReview'
import { useSyncState } from '@rotra/data/sync/useSyncState'
import { formatTime } from '@rotra/ui/now-card/helpers'
import { SessionDoneSheet, type SessionDoneStep } from '@rotra/ui/session-done-sheet'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectDev } from '@/store/slices/devSlice'

export type SessionDoneFlowProps = {
  sessionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/**
 * Q-SESSION-DONE → D-MINIMUM → D-SESSION-DONE: the three-step Session done sheet over
 * useSessionDoneReview. The step is local state and starts at review every time the sheet opens;
 * Continue goes to the shortfall step only while someone is below the minimum, otherwise straight
 * to the confirmation. Back to session closes the sheet; Back on the confirmation returns to review.
 * Confirm Session done calls useFinalizeSession with a commandId generated once per open sheet (a
 * second tap replays the same command and never starts a second finalization) and pushes the
 * finishing route, where Q-FINALIZE-PROGRESS follows the stages. Nothing is finished or invalidated
 * from here.
 */
export function SessionDoneFlow({ sessionId, open, onOpenChange }: SessionDoneFlowProps) {
  const router = useRouter()
  const dev = useAppSelector(selectDev)
  const session = useQueueSession(sessionId)
  const review = useSessionDoneReview(sessionId, { enabled: open })
  const sync = useSyncState()
  const finalize = useFinalizeSession(sessionId)
  const [step, setStep] = useState<SessionDoneStep>('review')
  // One confirmation ID per open sheet: the idempotency key the mock finalization dedupes on.
  const commandId = useRef<string | null>(null)

  useEffect(() => {
    if (open) {
      setStep('review')
      commandId.current = crypto.randomUUID()
    }
  }, [open])

  const s = session.data
  const r = review.data
  if (!s || !r) return null

  // The DevMenu toggle disables Confirm the moment the device goes offline, before the sync
  // state refetches; the pending count is the live one, so Confirm enables as soon as it reaches 0.
  const online = !dev.offline && (sync.data ? sync.data.online : true)
  const pendingChanges = sync.data ? sync.data.pendingCount : r.pendingChanges

  const onConfirm = () => {
    if (finalize.isPending || !online || pendingChanges > 0) return
    const id = commandId.current ?? crypto.randomUUID()
    commandId.current = id
    // A promise handler, not mutate's onError: the console unmounts once the finishing route opens,
    // and the failure toast must still show. The finishing screen shows the error and its retry.
    finalize.mutateAsync({ sessionId, commandId: id }).catch((error: unknown) => {
      onOpenChange(false)
      toast.error(errorMessage(error))
    })
    // The finishing screen follows the stages from the finalization status; the sheet goes away.
    router.push(`/sessions/${sessionId}/finishing`)
  }

  return (
    <SessionDoneSheet
      open={open}
      onOpenChange={onOpenChange}
      step={step}
      sessionTitle={s.title}
      timeRange={`${formatTime(s.scheduledStartAt)}–${formatTime(s.scheduledEndAt)}`}
      gamesRecorded={r.gamesRecorded}
      participants={r.participants}
      pendingChanges={pendingChanges}
      activeGames={r.activeGames.map((g) => ({ courtLabels: g.courtLabels.join(' + ') }))}
      unplayedWaiting={r.unplayedWaiting}
      belowMinimum={r.belowMinimum}
      minimum={r.minimum}
      online={online}
      isPending={finalize.isPending}
      onBackToSession={() => onOpenChange(false)}
      onContinue={() => setStep(r.belowMinimum.length > 0 ? 'minimum' : 'confirm')}
      onContinueToFinish={() => setStep('confirm')}
      onBack={() => setStep('review')}
      onConfirm={onConfirm}
    />
  )
}
