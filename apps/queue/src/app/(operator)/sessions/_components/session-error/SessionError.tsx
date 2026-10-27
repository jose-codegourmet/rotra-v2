'use client'

import { MockError } from '@rotra/data/mock/errors'
import { ErrorState } from '@rotra/ui/error-state'

export type SessionErrorProps = { error: Error; reset: () => void }

/** The sessions routes' error boundary: Retry re-renders; permission errors get no Retry. */
export function SessionError({ error, reset }: SessionErrorProps) {
  const permission = error instanceof MockError && error.kind === 'permission'
  return (
    <main className="mx-auto max-w-[860px] px-4 pt-5">
      <ErrorState
        kind={permission ? 'permission' : 'retryable'}
        title="Couldn't load this session."
        onRetry={reset}
      >
        {permission ? error.message : 'Check your connection, then try again.'}
      </ErrorState>
    </main>
  )
}
