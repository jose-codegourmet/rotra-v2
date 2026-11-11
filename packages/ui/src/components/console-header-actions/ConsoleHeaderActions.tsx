'use client'

import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import { OverflowMenu, type OverflowMenuItem } from '@rotra/ui/overflow-menu'

export type ConsoleHeaderActionsProps = {
  /** Open match requests; the button always shows and turns the warn colour (bold) while above 0 */
  matchRequestCount: number
  /** "Match requests · N": opens the Requests sheet (match requests only) */
  onOpenMatchRequests: () => void
  /** "Courts and time": opens CourtsAndTimeSheet */
  onOpenCourtsAndTime: () => void
  /** "Payments": opens the payments sheet */
  onOpenPayments: () => void
  /** ⋯ More menu › Public page */
  onOpenPublicPage: () => void
  /** ⋯ More menu › Copy Facebook post */
  onCopyFacebookPost: () => void
  /** ⋯ More menu › Session settings (the preparation page) */
  onOpenSessionSettings: () => void
  /** ⋯ More menu › Home */
  onGoHome: () => void
  className?: string
}

/**
 * The live console header's controls (Q-CONSOLE), at the upper right of the title block and wrapping
 * under it on narrow screens: one compact cluster with **Match requests · N** (warn-coloured while any
 * is waiting), **Courts and time**, **Payments** and a ⋯ **More for this session** menu holding Public
 * page, Copy Facebook post, Session settings and Home. The menu closes on Escape and on a tap outside.
 */
export function ConsoleHeaderActions({
  matchRequestCount,
  onOpenMatchRequests,
  onOpenCourtsAndTime,
  onOpenPayments,
  onOpenPublicPage,
  onCopyFacebookPost,
  onOpenSessionSettings,
  onGoHome,
  className,
}: ConsoleHeaderActionsProps) {
  const waiting = matchRequestCount > 0
  const more: OverflowMenuItem[] = [
    { label: 'Public page', icon: 'external', onSelect: onOpenPublicPage },
    { label: 'Copy Facebook post', icon: 'link', onSelect: onCopyFacebookPost },
    { label: 'Session settings', icon: 'nav-gear', onSelect: onOpenSessionSettings },
    { label: 'Home', icon: 'back', onSelect: onGoHome },
  ]
  return (
    <div className={cn('flex flex-none flex-wrap items-center justify-end gap-2', className)}>
      <Button
        size="sm"
        aria-label={`Match requests · ${matchRequestCount}${waiting ? ' waiting' : ''}`}
        className={cn(
          waiting &&
            'border-warn bg-warn font-extrabold text-on-accent hover:not-disabled:bg-warn hover:not-disabled:brightness-95',
        )}
        onClick={onOpenMatchRequests}
      >
        Match requests · {matchRequestCount}
      </Button>
      <Button size="sm" onClick={onOpenCourtsAndTime}>
        Courts and time
      </Button>
      <Button size="sm" onClick={onOpenPayments}>
        Payments
      </Button>
      <OverflowMenu label="More for this session" triggerSize="sm" items={more} />
    </div>
  )
}
