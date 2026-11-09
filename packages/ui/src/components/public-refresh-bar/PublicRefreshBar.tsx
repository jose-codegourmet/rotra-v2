import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'

export type PublicRefreshBarProps = {
  /** Time of the data the page shows, already formatted: "7:42 PM" */
  updatedLabel: string
  /** The server knows venue changes are still waiting to sync */
  hasPendingChanges?: boolean
  /** Refresh was tapped less than 10 s ago (the throttle lives in the data hook, Q17.3) */
  refreshThrottled?: boolean
  /** The visitor is offline: Refresh is disabled and says "You're offline. Reconnect and try again." */
  offline?: boolean
  onRefresh: () => void
  className?: string
}

/**
 * "Updated 7:42 PM · Refresh" under the public page's hero, for signed-in viewers. Refreshes data
 * only; while throttled the button is disabled and says "Refresh again in a few seconds".
 * Presentation only: the throttle state comes from the caller.
 */
export function PublicRefreshBar({
  updatedLabel,
  hasPendingChanges = false,
  refreshThrottled = false,
  offline = false,
  onRefresh,
  className,
}: PublicRefreshBarProps) {
  const hint = offline
    ? "You're offline. Reconnect and try again."
    : refreshThrottled
      ? 'Refresh again in a few seconds'
      : undefined
  return (
    <div
      aria-live="polite"
      className={cn('flex items-center justify-between gap-2 text-[13px] text-fg2', className)}
    >
      <span>
        Updated {updatedLabel}
        {hasPendingChanges ? " · Venue changes haven't synced yet" : null}
      </span>
      <Button
        size="xs"
        onClick={onRefresh}
        disabled={refreshThrottled || offline}
        title={hint}
        aria-label={hint ? `Refresh. ${hint}` : undefined}
      >
        Refresh
      </Button>
    </div>
  )
}
