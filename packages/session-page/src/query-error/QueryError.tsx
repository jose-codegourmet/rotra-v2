'use client'

import { MockError } from '@rotra/data/mock/errors'
import { ErrorState } from '@rotra/ui/error-state'
import type { ReactNode } from 'react'

export type QueryErrorProps = {
  /** The failed TanStack query */
  query: { error: unknown; refetch: () => unknown; isFetching: boolean }
  /** "Couldn't load the club." */
  title: ReactNode
  className?: string
}

/** Maps a failed query to ErrorState: permission errors get a bounded explanation, the rest a Retry. */
export function QueryError({ query, title, className }: QueryErrorProps) {
  const error = query.error
  const kind =
    error instanceof MockError && error.kind === 'permission' ? 'permission' : 'retryable'
  const offline = error instanceof MockError && error.kind === 'offline'
  return (
    <ErrorState
      kind={kind}
      title={title}
      className={className}
      onRetry={() => {
        void query.refetch()
      }}
      retrying={query.isFetching}
    >
      {kind === 'permission'
        ? error instanceof Error
          ? error.message
          : 'You are not allowed to see this.'
        : offline
          ? "You're offline. Reconnect, then try again."
          : 'Check your connection, then try again.'}
    </ErrorState>
  )
}
