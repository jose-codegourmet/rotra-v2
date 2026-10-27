import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'

export type ConsoleFooterBarProps = {
  /** Completed games (Match done, not invalid) */
  gamesRecorded: number
  /** Matches on a court right now */
  inPlay: number
  /** Matches waiting in the Queue */
  waiting: number
  /** Session done needs internet: offline it is disabled with the connect hint */
  online: boolean
  /** Opens the Session done review; when missing the button is disabled */
  onSessionDone?: () => void
  className?: string
}

/**
 * The bar fixed to the bottom of the live console: "G games recorded · A in play · W waiting" and
 * Session done. Starts beside the nav rail on wide screens; hidden at 900 px and below because the
 * dock carries Session done there.
 */
export function ConsoleFooterBar({
  gamesRecorded,
  inPlay,
  waiting,
  online,
  onSessionDone,
  className,
}: ConsoleFooterBarProps) {
  return (
    <div
      className={cn(
        'fixed right-0 bottom-0 left-[var(--rail,0px)] z-15 border-t border-border bg-bg/94 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-[8px]',
        'max-[900px]:hidden',
        className,
      )}
    >
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-[max(16px,env(safe-area-inset-left,0px))] py-2.5">
        <span className="text-[13px] text-fg2 tabular-nums">
          {gamesRecorded} games recorded · {inPlay} in play · {waiting} waiting
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {online ? null : (
            <span className="text-[13px] text-fg2">Connect to finish and sync this session.</span>
          )}
          <Button size="sm" onClick={onSessionDone} disabled={!online || !onSessionDone}>
            Session done
          </Button>
        </span>
      </div>
    </div>
  )
}
