'use client'

import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useAnswerInterruption } from '@rotra/data/sync/useAnswerInterruption'
import { useSessionIntegrity } from '@rotra/data/sync/useSessionIntegrity'
import { Button } from '@rotra/ui/button'
import { ConflictReviewList } from '@rotra/ui/conflict-review-list'
import { InterruptionCheckSheet } from '@rotra/ui/interruption-check-sheet'
import { RecoveryStatusPanel } from '@rotra/ui/recovery-status-panel'
import { SessionRecoveryScreen } from '@rotra/ui/session-recovery-screen'
import { Skeleton } from '@rotra/ui/skeleton'
import { UnrecoverableSessionPanel } from '@rotra/ui/unrecoverable-session-panel'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { QueryError } from '@/app/(operator)/_components/query-error/QueryError'
import { InvalidSessionDialog } from '@/app/(operator)/sessions/[sessionId]/_components/invalid-session-dialog/InvalidSessionDialog'
import { PlayerProfile } from '@/app/(operator)/sessions/[sessionId]/_components/player-profile/PlayerProfile'

export function SessionRecovery({ sessionId }: { sessionId: string }) {
  const session = useQueueSession(sessionId),
    integrity = useSessionIntegrity(sessionId),
    answer = useAnswerInterruption(),
    router = useRouter()
  const [invalid, setInvalid] = useState(false),
    [profile, setProfile] = useState<string | null>(null)
  const s = session.data,
    i = integrity.data
  useEffect(() => {
    if (s?.state === 'invalid' || s?.state === 'completed')
      router.replace(`/sessions/${sessionId}/record`)
  }, [s?.state, router, sessionId])
  return (
    <SessionRecoveryScreen
      title={s?.title ?? ''}
      onBack={() => router.push(`/sessions/${sessionId}`)}
    >
      {integrity.isError ? (
        <QueryError query={integrity} title="Couldn't load recovery status." />
      ) : session.isError ? (
        <QueryError query={session} title="Couldn't load this session." />
      ) : !i || !s ? (
        <Skeleton className="h-60 rounded-lg" />
      ) : (
        <>
          {i.state === 'unrecoverable' ? (
            <UnrecoverableSessionPanel onContinueToInvalid={() => setInvalid(true)} />
          ) : i.state === 'records_missing' ? (
            <InterruptionCheckSheet
              open={!invalid}
              onOpenChange={(open) => {
                if (!open) router.push(`/sessions/${sessionId}`)
              }}
              missingSummary={i.missingSummary}
              isPending={answer.isPending}
              error={answer.error?.message}
              onYes={() => answer.mutate({ sessionId, answer: 'yes' })}
              onNo={() => setInvalid(true)}
              onBack={() => router.push(`/sessions/${sessionId}`)}
            />
          ) : (
            <>
              <RecoveryStatusPanel
                state={i.state === 'awaiting_original' ? 'waiting' : 'received'}
              />
              {i.state === 'conflicts' ? (
                <ConflictReviewList conflicts={i.conflicts} onSelectPlayer={setProfile} />
              ) : null}
              {i.state === 'complete' ? (
                <Button
                  variant="primary"
                  onClick={() => router.push(`/sessions/${sessionId}?finish=1`)}
                >
                  Continue to Session done
                </Button>
              ) : null}
            </>
          )}
          <InvalidSessionDialog
            sessionId={sessionId}
            open={invalid}
            reason={
              i.state === 'unrecoverable'
                ? 'Original unsynced records are permanently unavailable.'
                : 'Session records are inconsistent and the session was not interrupted.'
            }
            onBack={() => setInvalid(false)}
          />
        </>
      )}
      <PlayerProfile clubPlayerId={profile} onClose={() => setProfile(null)} />
    </SessionRecoveryScreen>
  )
}
