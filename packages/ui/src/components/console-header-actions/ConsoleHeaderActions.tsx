'use client'

import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'

export type ConsoleHeaderActionsProps = {
  /** Open match requests; the button always shows and turns the warn colour (bold) while above 0 */
  matchRequestCount: number
  /** "Match requests · N": opens the Requests sheet (match requests only) */
  onOpenMatchRequests: () => void
  /** "Share": opens the Share dialog (list, social post images, invite link) */
  onShare: () => void
  className?: string
}

/**
 * The live console header's controls (Q-CONSOLE), at the upper right of the title block. Two controls:
 * **Match requests** (wide: a 40 px hand-icon button with the count as a badge on its corner, hidden at 0;
 * phones: a full-width button with the icon, the words and the count in a pill) and **Share**. On phones
 * the cluster takes the full row under the title and starts at the left.
 */
export function ConsoleHeaderActions({
  matchRequestCount,
  onOpenMatchRequests,
  onShare,
  className,
}: ConsoleHeaderActionsProps) {
  const waiting = matchRequestCount > 0
  return (
    <div
      className={cn(
        'flex flex-none items-center justify-end gap-2 max-[640px]:flex-[1_1_100%] max-[640px]:justify-start',
        className,
      )}
    >
      <Button
        size="sm"
        aria-label={`Match requests · ${matchRequestCount}${waiting ? ' waiting' : ''}`}
        title="Match requests"
        className={cn(
          'relative min-[641px]:w-10 min-[641px]:min-w-10 min-[641px]:p-0 max-[640px]:flex-1',
          waiting &&
            'border-warn bg-warn font-extrabold text-on-accent hover:not-disabled:bg-warn hover:not-disabled:brightness-95',
        )}
        onClick={onOpenMatchRequests}
      >
        <Icon name="hand" />
        <span className="max-[640px]:inline min-[641px]:hidden">Match requests</span>
        {waiting ? (
          <span
            className={cn(
              'grid tabular-nums place-items-center rounded-full bg-warn font-extrabold text-on-accent',
              'min-[641px]:absolute min-[641px]:-top-1.5 min-[641px]:-right-1.5 min-[641px]:h-[18px] min-[641px]:min-w-[18px] min-[641px]:border-2 min-[641px]:border-bg min-[641px]:px-[5px] min-[641px]:text-[11px]',
              'max-[640px]:h-[22px] max-[640px]:min-w-[22px] max-[640px]:bg-[color-mix(in_srgb,var(--on-accent)_18%,transparent)] max-[640px]:px-1.5 max-[640px]:text-xs',
            )}
          >
            {matchRequestCount}
          </span>
        ) : null}
      </Button>
      <Button size="sm" onClick={onShare}>
        <Icon name="share" />
        Share
      </Button>
    </div>
  )
}
