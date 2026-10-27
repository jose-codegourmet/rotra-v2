import { Button } from '@rotra/ui/button'
import { Notice } from '@rotra/ui/notice'
import type { ReactNode } from 'react'

export type ErrorStateProps = {
  /**
   * retryable: the request failed and can be tried again (Retry shown).
   * permission: the viewer is not allowed to see this; nothing private is shown and there is no Retry.
   */
  kind?: 'retryable' | 'permission'
  /** Bold lead-in, e.g. "Couldn't load the leaderboard." */
  title: ReactNode
  /** What to do next, e.g. "Check your connection, then try again." */
  children?: ReactNode
  onRetry?: () => void
  /** Disables Retry while the new attempt is running */
  retrying?: boolean
  retryLabel?: string
  className?: string
}

/**
 * A failed load: the prototypes' error .notice with a Try again button, or a bounded access
 * explanation when the viewer lacks permission.
 */
export function ErrorState({
  kind = 'retryable',
  title,
  children,
  onRetry,
  retrying,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  if (kind === 'permission') {
    return (
      <Notice tone="info" icon="lock" title={title} className={className}>
        {children}
      </Notice>
    )
  }
  return (
    <div className={className}>
      <Notice tone="error" title={title}>
        {children}
      </Notice>
      {onRetry ? (
        <div className="mt-3 flex">
          <Button size="sm" onClick={onRetry} loading={retrying}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
