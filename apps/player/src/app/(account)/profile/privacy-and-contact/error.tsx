'use client'
import { ErrorState } from '@rotra/ui/error-state'
export default function ProfileError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto max-w-[640px] px-4 pt-5">
      <ErrorState title="Couldn't load this page." retryLabel="Retry" onRetry={reset}>
        Check your connection, then try again.
      </ErrorState>
    </main>
  )
}
