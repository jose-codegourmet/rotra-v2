'use client'

import { useFinalizeSession } from '@rotra/data/queue-session/useFinalizeSession'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionDoneReview } from '@rotra/data/queue-session/useSessionDoneReview'
import { useSessionIntegrity } from '@rotra/data/sync/useSessionIntegrity'
import { useAnswerInterruption } from '@rotra/data/sync/useAnswerInterruption'
import { InterruptionCheckSheet } from '@rotra/ui/interruption-check-sheet'
import { InvalidSessionDialog } from '../invalid-session-dialog/InvalidSessionDialog'
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
  const integrity = useSessionIntegrity(sessionId), answer = useAnswerInterruption()
  const [interruptionOpen, setInterruptionOpen] = useState(false)
  const [invalidOpen, setInvalidOpen] = useState(false)
  const finalize = useFinalizeSession()
  const [step, setStep] = useState<SessionDoneStep>('review')
  // One confirmation ID per open sheet: the idempotency key the mock finalization dedupes on.
  const commandId = useRef<string | null>(null)

  useEffect(() => {
    if (open) {
      setStep('review')
      setInterruptionOpen(false)
      setInvalidOpen(false)
      commandId.current = crypto.randomUUID()
    }
  }, [open])

  const s = session.data
  const r = review.data
  if (!s || !r) return null

  const online = sync.data ? sync.data.online : !dev.offline

  const continueToConfirm = () => {
    if (!integrity.data) return
    if (integrity.data.state !== 'complete') {
      setInterruptionOpen(true)
      return
    }
    setStep('confirm')
  }
  const showInterruption = interruptionOpen || open && step === 'confirm' && !!integrity.data && integrity.data.state !== 'complete'
  const onConfirm = () => {
    if (!integrity.data || integrity.data.state !== 'complete') { continueToConfirm(); return }
    if (finalize.isPending) return
    const id = commandId.current ?? crypto.randomUUID()
    commandId.current = id
    finalize.mutate(
      { sessionId, commandId: id },
      {
        onError: (error) => {
          onOpenChange(false)
          toast.error(errorMessage(error))
        },
      },
    )
    // The finishing screen follows the stages from the finalization status; the sheet goes away.
    router.push(`/sessions/${sessionId}/finishing`)
  }

  return (
    <>
    <SessionDoneSheet
      open={open && !showInterruption && !invalidOpen}
      onOpenChange={onOpenChange}
      step={step}
      sessionTitle={s.title}
      timeRange={`${formatTime(s.scheduledStartAt)}–${formatTime(s.scheduledEndAt)}`}
      gamesRecorded={r.gamesRecorded}
      participants={r.participants}
      pendingChanges={r.pendingChanges}
      activeGames={r.activeGames.map((g) => ({ courtLabels: g.courtLabels.join(' + ') }))}
      unplayedWaiting={r.unplayedWaiting}
      belowMinimum={r.belowMinimum}
      minimum={r.minimum}
      online={online}
      isPending={finalize.isPending}
      onBackToSession={() => onOpenChange(false)}
      onContinue={() => r.belowMinimum.length > 0 ? setStep('minimum') : continueToConfirm()}
      onContinueToFinish={continueToConfirm}
      onBack={() => setStep('review')}
      onConfirm={onConfirm}
    />
    <InterruptionCheckSheet open={open && showInterruption && !invalidOpen} onOpenChange={(next) => { if (!next) onOpenChange(false) }} missingSummary={integrity.data?.missingSummary ?? []} isPending={answer.isPending} error={answer.error?.message} onBack={() => onOpenChange(false)} onNo={() => setInvalidOpen(true)} onYes={() => answer.mutate({ sessionId, answer: 'yes' }, { onSuccess: () => { onOpenChange(false); router.push(`/sessions/${sessionId}/recovery`) }, onError: (error) => toast.error(error.message) })} />
    <InvalidSessionDialog sessionId={sessionId} open={open && invalidOpen} reason="Session records are inconsistent and the session was not interrupted." onBack={() => setInvalidOpen(false)} />
    </>
  )
}
