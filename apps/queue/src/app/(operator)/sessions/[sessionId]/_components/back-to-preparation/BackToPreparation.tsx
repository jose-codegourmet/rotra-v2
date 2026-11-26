'use client'

import type { Match } from '@rotra/data/match/types'
import { backToPreparationBlocker } from '@rotra/data/queue-session/queueSession.rules'
import type { QueueSession } from '@rotra/data/queue-session/types'
import { useBackToPreparation } from '@rotra/data/queue-session/useBackToPreparation'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { Notice } from '@rotra/ui/notice'
import { formatShortDate, formatTimeRange } from '@rotra/ui/now-card/helpers'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'

export type BackToPreparationProps = {
  session: QueueSession
  matches: Match[]
  online: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * D-BACK-TO-PREP: the Settings tab's Back to preparation… confirmation (owner, November 25, 2026).
 * Lists what undoing Start does, with the planned time it goes back to (the window kept at Start, or
 * the current one for sessions started before that was kept), then opens the preparation page.
 */
export function BackToPreparation({
  session,
  matches,
  online,
  open,
  onOpenChange,
}: BackToPreparationProps) {
  const router = useRouter()
  const back = useBackToPreparation()
  const planned = session.plannedBeforeStart ?? {
    startAt: session.scheduledStartAt,
    endAt: session.scheduledEndAt,
  }
  const removed = matches.filter((m) => m.state === 'waiting' || m.state === 'on_court').length
  const blocker = backToPreparationBlocker(matches, online)
  const confirm = () =>
    back.mutate(session.id, {
      onSuccess: (result) => {
        toast(result.message)
        onOpenChange(false)
        router.push(`/sessions/${session.id}/preparation`)
      },
    })
  return (
    <ConfirmSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) back.reset()
        onOpenChange(next)
      }}
      title="Back to preparation?"
      summary={`${session.title} goes back to preparation, as if it had not started.`}
      consequence={
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>Every player's level unlocks.</li>
          <li>
            The start time clears, and the planned time goes back to{' '}
            {formatShortDate(planned.startAt)}, {formatTimeRange(planned.startAt, planned.endAt)}.
          </li>
          {removed > 0 ? (
            <li>
              {removed} match
              {removed === 1
                ? ' in the Main Queue or on court is'
                : 'es in the Main Queue or on court are'}{' '}
              removed.
            </li>
          ) : null}
          <li>
            Join requests closed at Start stay closed. The session link takes new requests again.
          </li>
        </ul>
      }
      notice={blocker ? <Notice tone="warn">{blocker}</Notice> : undefined}
      backLabel="Keep it live"
      confirmLabel="Back to preparation"
      onConfirm={confirm}
      confirmDisabled={blocker !== null}
      isPending={back.isPending}
      error={back.error instanceof Error ? back.error.message : undefined}
    />
  )
}
