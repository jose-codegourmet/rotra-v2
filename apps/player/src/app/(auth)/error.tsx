'use client'
import { AuthCard } from '@rotra/ui/auth-card'
import { ErrorState } from '@rotra/ui/error-state'
export default function AuthError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <AuthCard showBrand={false} title="Couldn't load this page.">
      <ErrorState
        title="Check your connection, then try again."
        retryLabel="Retry"
        onRetry={reset}
      />
    </AuthCard>
  )
}
