import { Button } from '@rotra/ui/button'
import { GoogleMark } from '@rotra/ui/google-mark'
import type { ReactNode } from 'react'

export type AnnouncementBandProps = {
  /** The message, e.g. "<b>Verify your ROTRA account by December 31, 2026.</b> …" */
  children: ReactNode
  /** One or two buttons (Button size "xs") and a secondary link, in the order they should show */
  actions?: ReactNode
  /**
   * The deadline has passed: the bottom border is thicker and "Remind me later" is not shown, so
   * the band cannot be put off.
   */
  afterDeadline?: boolean
  /** Puts the band off for this visit. Ignored after the deadline. */
  onRemindLater?: () => void
  /** Replaces the Google mark in front of the message */
  icon?: ReactNode
}

/**
 * The prototype's .band-ann: the yellow "ROTRA announcement" band at the top of every page while the
 * signed-in player isn't verified. It sits in the same slot as EmailConfirmBanner, as a second band.
 * Yellow (--ann-*) stays distinct from the amber warnings.
 */
export function AnnouncementBand({
  children,
  actions,
  afterDeadline = false,
  onRemindLater,
  icon,
}: AnnouncementBandProps) {
  const showRemind = !afterDeadline && onRemindLater !== undefined
  return (
    <div
      role="region"
      aria-label="Announcement from ROTRA"
      className={
        afterDeadline
          ? 'border-b-2 border-ann-border bg-ann-bg text-[13px] text-fg'
          : 'border-b border-ann-border bg-ann-bg text-[13px] text-fg'
      }
    >
      <div className="mx-auto flex max-w-[1240px] items-start gap-2.5 py-2.5 pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))]">
        {icon ?? <GoogleMark className="mt-0.5" />}
        <div className="min-w-0">
          <span>
            <span className="mr-1.5 inline-block text-[11px] font-bold tracking-[0.5px] text-ann-tag uppercase">
              ROTRA announcement
            </span>
            {children}
          </span>
          {actions || showRemind ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {actions}
              {showRemind ? (
                <Button size="xs" variant="ghost" onClick={onRemindLater}>
                  Remind me later
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
