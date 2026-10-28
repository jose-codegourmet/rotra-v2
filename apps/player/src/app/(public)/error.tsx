'use client'
import { ErrorState } from '@rotra/ui/error-state'
export default function PlayerError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto max-w-[920px] px-4 pt-5">
      <ErrorState title="Couldn't load this page." retryLabel="Retry" onRetry={reset}>
        Try again.
      </ErrorState>
    </main>
  )
}
