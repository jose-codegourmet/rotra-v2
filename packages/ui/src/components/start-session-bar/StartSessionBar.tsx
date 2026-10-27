import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'

export type StartSessionBarProps = {
  /** The first blocking reason, or null when the session can start */
  blocker: string | null
  /** Another session is live: an "Open TITLE" button next to the reason */
  otherLive?: { title: string; onOpen: () => void }
  rosterCount: number
  presentCount: number
  onStart: () => void
  className?: string
}

/**
 * The bar fixed to the bottom of preparation: the first blocking reason (or the ready text) and
 * Start session. Starts beside the nav rail on wide screens; on phones the dock carries the button,
 * so the bar shrinks to the reason or hides when ready.
 */
export function StartSessionBar({
  blocker,
  otherLive,
  rosterCount,
  presentCount,
  onStart,
  className,
}: StartSessionBarProps) {
  return (
    <div
      className={cn(
        'fixed right-0 bottom-0 left-[var(--rail,0px)] z-15 border-t border-border bg-bg/94 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-[8px]',
        'max-[900px]:bottom-[calc(72px+env(safe-area-inset-bottom,0px))] max-[900px]:left-0',
        !blocker && 'max-[900px]:hidden',
        className,
      )}
    >
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-[max(16px,env(safe-area-inset-left,0px))] py-2.5">
        <span
          className={cn(
            'flex flex-wrap items-center gap-2 text-[13px]',
            blocker ? 'font-semibold text-warn' : 'text-fg2',
          )}
        >
          {blocker ??
            `${rosterCount} players · ${presentCount} present. Starting locks levels; no match starts by itself.`}
          {otherLive ? (
            <Button size="xs" onClick={otherLive.onOpen}>
              Open {otherLive.title}
            </Button>
          ) : null}
        </span>
        <Button
          variant="primary"
          onClick={onStart}
          disabled={Boolean(blocker)}
          className="max-[900px]:hidden"
        >
          Start session
        </Button>
      </div>
    </div>
  )
}
