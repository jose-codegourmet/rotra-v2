'use client'

import { useAutoQueue } from '@rotra/data/match/useAutoQueue'
import { MockError } from '@rotra/data/mock/errors'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { type AutoQueueCount, AutoQueueSheet } from '@rotra/ui/auto-queue-sheet'
import { toast } from '@rotra/ui/toaster'
import { useRef, useState } from 'react'

export type AutoQueueProps = {
  sessionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The matches were added: the shell switches the console to the Queue tab */
  onAdded: () => void
}

/** The prototype's preselection; the default number of rounds is an open decision */
const DEFAULT_COUNT: AutoQueueCount = 3

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/** A save that could not be made durable on this device ("Changes could not be saved") or offline */
const isSaveFailure = (error: unknown) =>
  error instanceof MockError && (error.kind === 'retryable' || error.kind === 'offline')

/**
 * Q-AUTO: AutoQueueSheet on useAutoQueue with the session's mode, formats, present count and
 * minimum, 3 matches preselected. Generate N matches toasts "N matches added to the queue", closes
 * and switches the console to the Queue tab; a generation failure (too few present, both formats
 * off) stays in the sheet with the queue unchanged. A save failure is an error toast.
 */
export function AutoQueue({ sessionId, open, onOpenChange, onAdded }: AutoQueueProps) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const autoQueue = useAutoQueue()
  const [count, setCount] = useState<AutoQueueCount>(DEFAULT_COUNT)
  const [error, setError] = useState<string | undefined>()
  // One run per attempt: a second tap can land before isPending reaches this render.
  const generating = useRef(false)

  const s = session.data
  if (!s) return null
  const presentCount = (roster.data?.roster ?? []).filter((p) => p.present).length

  const changeOpen = (next: boolean) => {
    if (!next) {
      setError(undefined)
      setCount(DEFAULT_COUNT)
    }
    onOpenChange(next)
  }

  const onGenerate = (n: AutoQueueCount) => {
    if (generating.current || autoQueue.isPending) return
    generating.current = true
    setError(undefined)
    autoQueue.mutate(
      { sessionId, n },
      {
        onSuccess: (result) => {
          toast(result.message)
          changeOpen(false)
          onAdded()
        },
        onError: (failure) => {
          if (isSaveFailure(failure)) toast.error(errorMessage(failure))
          else setError(errorMessage(failure))
        },
        onSettled: () => {
          generating.current = false
        },
      },
    )
  }

  return (
    <AutoQueueSheet
      open={open}
      onOpenChange={changeOpen}
      sessionMode={s.sessionMode}
      allowSingles={s.allowSingles}
      allowDoubles={s.allowDoubles}
      presentCount={presentCount}
      minimumGames={s.minimumGames}
      count={count}
      onCountChange={setCount}
      onGenerate={onGenerate}
      isPending={autoQueue.isPending}
      error={error}
    />
  )
}
